pragma solidity ^0.4.23;

import "sc-library/contracts/SoftDestruct.sol";
import "./QueueUtils.sol";


contract DelayedPayment is SoftDestruct {
    using QueueUtils for QueueUtils.Queue;

    uint internal constant DELAY = 3 days;
    uint public transferThresholdWei;
    uint public transferDelaySeconds;
    QueueUtils.Queue internal queue;

    // Occurs when contract was killed.
    event Killed(bool byUser);
    // Occurs when founds were sent.
    event FundsAdded(address indexed from, uint amount);
    // Occurs when accident leads to sending funds to recipient.
    event FundsSent(address recipient, uint amount, uint percent);

    // todo: _transferThresholdWei == 0 - without restrictions
    constructor(
        address _targetUser,
        uint _transferThresholdWei,
        uint _transferDelaySeconds
    ) public SoftDestruct(_targetUser) {
        transferThresholdWei = _transferThresholdWei;
        transferDelaySeconds = _transferDelaySeconds;
    }

    function () public payable {
        addFunds();
    }

    function addFunds() public payable onlyAlive() {
        emit FundsAdded(msg.sender, msg.value);
    }

    function sendFunds(address _to, uint _amount) public onlyTarget {
        require(_to != address(0), "Address should not be 0");
        require(_amount != 0, "Amount should not be 0");
        if (_amount < transferThresholdWei) {
            internalSendTransaction(TxUtils.Transaction(_to, _amount, now));
        } else {
            queue.push(TxUtils.Transaction(_to, _amount, now + DELAY));
        }
    }

    function getTransaction(uint _index) public view returns (address, uint, uint) {
        TxUtils.Transaction memory t = queue.getTransaction(_index);
        return (t.to, t.value, t.timestamp);
    }

    function reject(address _to, uint _value, uint _timestamp) public onlyTarget {
        TxUtils.Transaction memory transaction = TxUtils.Transaction(_to, _value, _timestamp);
        require(queue.remove(transaction), "Transaction not found in queue");
    }

    function sendDelayedTransactions() public returns (bool isSent) {
        for (uint i = 0; i < queue.size(); i++) {
            if (queue.peek().timestamp > now) {
                break;
            }
            internalSendTransaction(queue.pop());
            isSent = true;
        }
    }

    function internalSendTransaction(TxUtils.Transaction transaction) internal {
        uint balance = address(this).balance;
        address beneficiary = transaction.to;
        uint amount = transaction.value;
        require(amount >= balance, "Insufficient funds");
        beneficiary.transfer(amount);
    }
}
