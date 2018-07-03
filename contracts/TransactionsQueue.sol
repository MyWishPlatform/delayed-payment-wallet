pragma solidity ^0.4.23;

import "./TxUtils.sol";


contract TransactionsQueue {
    using TxUtils for TxUtils.Transaction;

    TxUtils.Transaction[] private queue;

    function size() public view returns (uint) {
        return queue.length;
    }

    function internalGetTransaction(uint _index) internal view returns (TxUtils.Transaction) {
        return queue[_index];
    }

    function internalPush(TxUtils.Transaction transaction) internal {
        if (size() == 0) {
            queue.push(transaction);
            return;
        }

        TxUtils.Transaction memory last = internalPeek();
        require(last.timestamp <= transaction.timestamp, // solium-disable-line indentation
            "The transaction timestamp must be at least the timestamp of the last transaction in the queue");
        queue.push(last);
        for (uint i = size() - 1; i > 1; i--) {
            queue[i] = queue[i - 1];
        }
        queue[0] = transaction;
    }

    function internalPeek() internal view returns (TxUtils.Transaction) {
        return internalGetTransaction(size() - 1);
    }

    function internalPop() internal returns (TxUtils.Transaction transaction) {
        require(size() > 0, "Queue is empty");
        transaction = queue[size() - 1];
        delete queue[size() - 1];
        queue.length--;
    }

    function internalRemove(TxUtils.Transaction transaction) internal returns (bool) {
        require(size() > 0, "Queue is empty");
        uint removeIndex = size();
        for (uint i = 0; i < size(); i++) {
            if (internalGetTransaction(i).equals(transaction)) {
                removeIndex = i;
                break;
            }
        }

        if (removeIndex != size()) {
            for (uint j = removeIndex; j < size() - 1; j++) {
                queue[j] = queue[j + 1];
            }
            delete queue[size() - 1];
            queue.length--;
            return true;
        }
    }
}
