pragma solidity ^0.4.23;


library TxUtils {
    struct Transaction {
        address to;
        uint value;
        uint timestamp;
    }

    function equals(Transaction self, Transaction other) internal pure returns (bool) {
        return (self.to == other.to) && (self.value == other.value) && (self.timestamp == other.timestamp);
    }
}
