pragma solidity ^0.4.23;

import "sc-library/contracts/wallet/Wallet.sol";
import "./LostKeyERC20Wallet.sol";
import "./utils/QueueUtils.sol";


contract LostKeyDelayedPaymentWallet is Wallet, LostKeyERC20Wallet {
  using QueueUtils for QueueUtils.Queue;

  // Threshold value, when sending more, the transaction will be postponed.
  // If the value is zero, then all transactions will be sent immediately.
  uint public transferThresholdWei;
  // The value of the delay to which the transaction will be postponed if the sum of the threshold value is exceeded.
  uint public transferDelaySeconds;
  // Transaction queue.
  QueueUtils.Queue internal queue;

  // Occurs when contract was killed.
  event Killed(bool byUser);
  // Occurs when founds were sent.
  event FundsAdded(address indexed from, uint amount);
  // Occurs when accident leads to sending funds to recipient.
  event FundsSent(address recipient, uint amount, uint percent);

  /**
   * @param _targetUser           Contract owner.
   * @param _recipients           A list of users between which the funds will be divided in the case of some period of
   *                              inactivity of the target user.
   * @param _percents             Percentages corresponding to users. How many users will receive from the total number
   *                              of shared funds.
   * @param _noActivityPeriod     The period of inactivity, after which the funds will be divided between the heirs.
   * @param _transferThresholdWei Threshold value. If you try to send an amount more than which the transaction will
   *                              be added to the queue and will be sent no earlier than _transferDelaySeconds
   *                              seconds. If the value is zero, then all transactions will be sent immediately.
   * @param _transferDelaySeconds The number of seconds that the sending of funds will be delayed if you try to send
   *                              an amount greater than _transferThresholdWei.
   */
  constructor(
    address _targetUser,
    address[] _recipients,
    uint[] _percents,
    uint64 _noActivityPeriod,
    uint _transferThresholdWei,
    uint _transferDelaySeconds
  )
    public
    LostKeyERC20Wallet(
      _targetUser,
      _recipients,
      _percents,
      _noActivityPeriod
    )
  {
    transferThresholdWei = _transferThresholdWei;
    transferDelaySeconds = _transferDelaySeconds;
  }

  /**
   * @notice  Same as sendFunds but for wallet compatibility. Sending funds to the recipient or delaying the
   *          transaction for a certain time. In case of a delay, the sendDelayedTransactions() function can send the
   *          transaction after the delay time has elapsed.
   *
   * @param _to     Recipient of funds.
   * @param _value  Amount of funds.
   * @param _data   Call data.
   */
  function execute(address _to, uint _value, bytes _data) external returns (bytes32) {
    sendFunds(_to, _value, _data);
    return keccak256(abi.encodePacked(msg.data, block.number));
  }

  /**
   * @notice  Sending funds to the recipient or delaying the transaction for a certain time. In case of a delay, the
   *          sendDelayedTransactions() function can send the transaction after the delay time has elapsed.
   *
   * @param _to     Recipient of funds.
   * @param _amount Amount of funds.
   * @param _data   Call data.
   */
  function sendFunds(address _to, uint _amount, bytes _data) public onlyTarget onlyAlive {
    require(_to != address(0), "Address should not be 0");
    if (_data.length == 0) {
      require(_amount != 0, "Amount should not be 0");
    }

    if (_amount < transferThresholdWei || transferThresholdWei == 0) {
      internalSendFunds(_to, _amount, _data);
    } else {
      queue.push(
        TxUtils.Transaction(
          _to,
          _amount,
          _data,
          now + transferDelaySeconds
        )
      );
    }
  }

  /**
   * @notice Returns pending transaction data with the specified index.
   *
   * @param _index        Transaction index in the queue.
   * @return to           Recipient of funds.
   * @return value        Amount sent to the recipient.
   * @return timestamp    Timestamp not earlier than which funds are allowed to be sent.
   */
  function getTransaction(uint _index) public view returns (address to, uint value, bytes data, uint timestamp) {
    TxUtils.Transaction memory t = queue.getTransaction(_index);
    return (t.to, t.value, t.data, t.timestamp);
  }

  /**
   * @notice Cancellation of a queued transaction.
   *
   * @param _to         The recipient of the transaction funds to be canceled.
   * @param _value      Amount of transaction funds to be canceled.
   * @param _data       Call data of transaction to be canceled.
   * @param _timestamp  Timestamp, not before that will be available to send the transaction to be canceled.
   */
  function reject(
    address _to,
    uint _value,
    bytes _data,
    uint _timestamp
  )
    public
    onlyTarget
  {
    TxUtils.Transaction memory transaction = TxUtils.Transaction(
      _to,
      _value,
      _data,
      _timestamp
    );
    require(queue.remove(transaction), "Transaction not found in queue");
  }

  /**
   * @notice Send all delayed transactions that are already allowed to send.
   *
   * @return isSent At least one transaction was sent.
   */
  function sendDelayedTransactions() public returns (bool isSent) {
    for (uint i = 0; i < queue.size(); i++) {
      if (queue.peek().timestamp > now) {
        break;
      }
      internalSendTransaction(queue.pop());
      isSent = true;
    }
  }

  /**
   * @return size Number of transactions in the queue.
   */
  function queueSize() public view returns (uint size) {
    return queue.size();
  }

  /**
   * @dev Immediate transaction sending.
   *
   * @param _tx The transaction to be sent.
   */
  function internalSendTransaction(TxUtils.Transaction _tx) internal {
    internalSendFunds(_tx.to, _tx.value, _tx.data);
  }
}
