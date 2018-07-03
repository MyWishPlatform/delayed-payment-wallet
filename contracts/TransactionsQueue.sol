pragma solidity ^0.4.23;


contract TransactionsQueue {
    struct Transaction {
        address to;
        uint value;
        uint timestamp;
    }

    Transaction[] private queue;

    function size() public view returns (uint) {
        return queue.length;
    }

    function internalGetTransaction(uint _index) internal view returns (Transaction) {
        return queue[_index];
    }

    function internalPush(Transaction transaction) internal {
        if (size() == 0) {
            queue.push(transaction);
            return;
        }

        Transaction memory last = internalPeek();
        require(last.timestamp <= transaction.timestamp, // solium-disable-line indentation
            "The transaction timestamp must be at least the timestamp of the last transaction in the queue");
        queue.push(last);
        for (uint i = size() - 1; i > 1; i--) {
            queue[i] = queue[i - 1];
        }
        queue[0] = transaction;
    }

    // todo: проверить что будет если достать когда size() == 0
    function internalPeek() internal view returns (Transaction) {
        return queue[size() - 1];
    }

    function internalPop() internal returns (Transaction transaction) {
        require(size() > 0, "Queue is empty");
        transaction = queue[size() - 1];
        queue.length--;
    }
}
