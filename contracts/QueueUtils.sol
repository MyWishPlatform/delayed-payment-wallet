pragma solidity ^0.4.23;

import "./TxUtils.sol";


library QueueUtils {
    using TxUtils for TxUtils.Transaction;

    struct Queue {
        TxUtils.Transaction[] queue;
    }

    function size(Queue self) internal pure returns (uint) {
        return self.queue.length;
    }

    function getTransaction(Queue storage self, uint _index) internal view returns (TxUtils.Transaction) {
        return self.queue[_index];
    }

    function push(Queue storage self, TxUtils.Transaction transaction) internal {
        if (size(self) == 0) {
            self.queue.push(transaction);
            return;
        }

        TxUtils.Transaction memory last = peek(self);
        require(last.timestamp <= transaction.timestamp, // solium-disable-line indentation
            "The transaction timestamp must be at least the timestamp of the last transaction in the queue");
        self.queue.push(last);
        for (uint i = size(self) - 1; i > 1; i--) {
            self.queue[i] = self.queue[i - 1];
        }
        self.queue[0] = transaction;
    }

    function peek(Queue storage self) internal view returns (TxUtils.Transaction) {
        return getTransaction(self, size(self) - 1);
    }

    function pop(Queue storage self) internal returns (TxUtils.Transaction transaction) {
        require(size(self) > 0, "Queue is empty");
        transaction = self.queue[size(self) - 1];
        delete self.queue[size(self) - 1];
        self.queue.length--;
    }

    function remove(Queue storage self, TxUtils.Transaction transaction) internal returns (bool) {
        require(size(self) > 0, "Queue is empty");
        uint removeIndex = size(self);
        for (uint i = 0; i < size(self); i++) {
            if (getTransaction(self, i).equals(transaction)) {
                removeIndex = i;
                break;
            }
        }

        if (removeIndex != size(self)) {
            for (uint j = removeIndex; j < size(self) - 1; j++) {
                self.queue[j] = self.queue[j + 1];
            }
            delete self.queue[size(self) - 1];
            self.queue.length--;
            return true;
        }
    }
}
