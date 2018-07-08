pragma solidity ^0.4.23;

import "./TxUtils.sol";


library QueueUtils {
    using TxUtils for TxUtils.Transaction;

    struct Queue {
        uint length;
        uint head;
        uint tail;
        mapping(uint => Node) list;
    }

    struct Node {
        uint prev;
        uint next;
        TxUtils.Transaction data; // key == data.timestamp
    }

    function size(Queue storage _self) internal view returns (uint) {
        return _self.length;
    }

    function isEmpty(Queue storage _self) internal view returns (bool) {
        return size(_self) == 0;
    }

    function getTransaction(Queue storage _self, uint _index) internal view returns (TxUtils.Transaction) {
        for (uint i = _self.tail; i >= _self.head; i = _self.list[i].prev) {
            Node memory node = _self.list[i];
            if (i == _index) {
                return node.data;
            }

            node = _self.list[node.next];
        }
    }

    function push(Queue storage _self, TxUtils.Transaction _tx) internal {
        require(_self.list[_tx.timestamp].data.isNull(), "Cannot push transaction with same timestamp");

        Node memory node;
        if (_self.list[_self.tail].data.isNull()) {
            node = Node(0, 0, _tx);
            _self.head = _tx.timestamp;
        } else {
            _self.list[_self.tail].prev = _tx.timestamp;
            Node storage nextNode = _self.list[_self.tail];
            node = Node(0, nextNode.data.timestamp, _tx);
            nextNode.prev = _tx.timestamp;
        }
        _self.list[_tx.timestamp] = node;
        _self.tail = _tx.timestamp;
        _self.length++;
    }

    function peek(Queue storage _self) internal view returns (TxUtils.Transaction) {
        return isEmpty(_self) ? TxUtils.Transaction(0, 0, 0) : _self.list[_self.head].data;
    }

    function pop(Queue storage _self) internal returns (TxUtils.Transaction) {
        if (isEmpty(_self)) {
            return TxUtils.Transaction(0, 0, 0);
        }

        if (size(_self) == 1) {
            _self.tail = 0;
        }

        Node memory current = _self.list[_self.head];
        uint newHead = current.prev;
        delete _self.list[_self.head];
        _self.head = newHead;
        _self.length--;

        return current.data;
    }

    function remove(Queue storage _self, TxUtils.Transaction _tx) internal returns (bool) {
        require(size(_self) > 0, "Queue is empty");

        uint iterator = _self.tail;
        while (iterator != 0) {
            Node memory node = _self.list[iterator];
            if (node.data.equals(_tx)) {
                if (node.prev != 0 && node.next != 0) {
                    _self.list[node.prev].next = _self.list[node.next].data.timestamp;
                    _self.list[node.next].prev = _self.list[node.next].data.timestamp;
                } else if (node.prev != 0) {
                    _self.list[node.prev].next = 0;
                    _self.head = node.prev;
                } else if (node.next != 0) {
                    _self.list[node.next].prev = 0;
                    _self.tail = node.next;
                }

                delete _self.list[iterator];
                _self.length--;
                return true;
            }
            iterator = _self.list[iterator].next;
        }

        return false;
    }
}
