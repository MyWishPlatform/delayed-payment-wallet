pragma solidity ^0.4.23;


library TxUtils {
    struct Transaction {
        address to;
        uint value;
        bytes data;
        uint timestamp;
    }

    function equals(Transaction self, Transaction other) internal pure returns (bool) {
        return (self.to == other.to) && (self.value == other.value) && (self.timestamp == other.timestamp);
    }

    function isNull(Transaction self) internal pure returns (bool) {
        return equals(self, Transaction(address(0), 0, "", 0));  // solium-disable-line arg-overflow
    }
}
