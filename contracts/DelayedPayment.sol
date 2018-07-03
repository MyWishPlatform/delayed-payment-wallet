pragma solidity ^0.4.23;

import "sc-library/contracts/SoftDestruct.sol";
import "./TransactionsQueue.sol";


contract DelayedPayment is TransactionsQueue, SoftDestruct {
    uint private DELAY = 3 days;
    uint public transferThresholdWei;
    uint public transferDelaySeconds;

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

    function addFunds() public payable onlyAlive() /*notTriggered*/ {
        emit FundsAdded(msg.sender, msg.value);
    }

    function sendFunds(address _to, uint _amount) public onlyTarget {
        require(_to != address(0), "Address should not be 0");
        require(_amount != 0, "Amount should not be 0");
        if (_amount < transferThresholdWei) {
            internalSendTransaction(Transaction(_to, _amount, now));
        } else {
            internalPush(Transaction(_to, _amount, now + DELAY));
        }
    }

    function getTransaction(uint _index) public view returns (address, uint, uint) {
        Transaction memory t = internalGetTransaction(_index);
        return (t.to, t.value, t.timestamp);
    }

    function internalSendDelayedTransactions() internal returns (bool isSent) {
        for (uint i = 0; i < size(); i++) {
            if (internalPeek().timestamp > now) {
                break;
            }
            internalSendTransaction(internalPop());
            isSent = true;
        }
    }

    function internalSendTransaction(Transaction transaction) internal {
        uint balance = address(this).balance;
        address beneficiary = transaction.to;
        uint amount = transaction.value;
        require(amount >= balance, "Insufficient funds");
        beneficiary.transfer(amount);
    }

    // todo: function reject
}
