pragma solidity ^0.4.23;

import "sc-library/contracts/SoftDestruct.sol";
import "./QueueUtils.sol";


contract DelayedPayment is SoftDestruct {
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
     * @param _transferThresholdWei Threshold value. If you try to send an amount more than which the transaction will
     *                              be added to the queue and will be sent no earlier than _transferDelaySeconds
     *                              seconds. If the value is zero, then all transactions will be sent immediately.
     * @param _transferDelaySeconds The number of seconds that the sending of funds will be delayed if you try to send
     *                              an amount greater than _transferThresholdWei.
     */
    constructor(
        address _targetUser,
        uint _transferThresholdWei,
        uint _transferDelaySeconds
    ) public SoftDestruct(_targetUser) {
        transferThresholdWei = _transferThresholdWei;
        transferDelaySeconds = _transferDelaySeconds;
    }

    function() public payable {
        addFunds();
    }

    /**
     * Deposit to wallet contract. Available only if the contract was not killed.
     */
    function addFunds() public payable onlyAlive() {
        emit FundsAdded(msg.sender, msg.value);
    }

    /**
     * @notice  Sending funds to the recipient or delaying the transaction for a certain time. In case of a delay, the
     *          sendDelayedTransactions() function can send the transaction after the delay time has elapsed.
     *
     * @param _to       Recipient of funds.
     * @param _amount   Amount of funds.
     */
    function sendFunds(address _to, uint _amount) public onlyTarget {
        require(_to != address(0), "Address should not be 0");
        require(_amount != 0, "Amount should not be 0");
        if (_amount < transferThresholdWei || transferThresholdWei == 0) {
            internalSendTransaction(TxUtils.Transaction(_to, _amount, now));
        } else {
            queue.push(TxUtils.Transaction(_to, _amount, now + transferDelaySeconds));
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
    function getTransaction(uint _index) public view returns (address to, uint value, uint timestamp) {
        TxUtils.Transaction memory t = queue.getTransaction(_index);
        return (t.to, t.value, t.timestamp);
    }

    /**
     * @notice Cancellation of a queued transaction.
     *
     * @param _to           The recipient of the transaction funds to be canceled.
     * @param _value        Amount of transaction funds to be canceled.
     * @param _timestamp    Timestamp, not before that will be available to send the transaction to be canceled.
     */
    function reject(address _to, uint _value, uint _timestamp) public onlyTarget {
        TxUtils.Transaction memory transaction = TxUtils.Transaction(_to, _value, _timestamp);
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
     * @dev Immediate transaction sending.
     *
     * @param transaction The transaction to be sent.
     */
    function internalSendTransaction(TxUtils.Transaction transaction) internal {
        uint balance = address(this).balance;
        address beneficiary = transaction.to;
        uint amount = transaction.value;
        require(amount <= balance, "Insufficient funds");
        beneficiary.transfer(amount);
    }
}
