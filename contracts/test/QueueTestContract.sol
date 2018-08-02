pragma solidity ^0.4.23;

import "../utils/QueueUtils.sol";


contract QueueTestContract {
    using QueueUtils for QueueUtils.Queue;

    QueueUtils.Queue private queue;

    function size() public view returns (uint) {
        return queue.size();
    }

    function isEmpty() public view returns (bool) {
        return queue.isEmpty();
    }

    function getTransaction(uint _index) public view returns (address, uint, uint) {
        TxUtils.Transaction memory t = queue.getTransaction(_index);
        return (t.to, t.value, t.timestamp);
    }

    function push(address _to, uint _value, uint _timestamp) public {
        queue.push(TxUtils.Transaction(_to, _value, _timestamp));
    }

    function peek() public view returns (address, uint, uint) {
        TxUtils.Transaction memory t = queue.peek();
        return (t.to, t.value, t.timestamp);
    }

    function pop() public returns (address, uint, uint) {
        TxUtils.Transaction memory t = queue.pop();
        return (t.to, t.value, t.timestamp);
    }

    function remove(address _to, uint _value, uint _timestamp) public returns (bool) {
        return queue.remove(TxUtils.Transaction(_to, _value, _timestamp));
    }
}
