pragma solidity ^0.4.23;

import "sc-library/contracts/wallet/Wallet.sol";
import "sc-library/contracts/wallet/ERC20Wallet.sol";
import "./DelayedPayment.sol";


contract DelayedPaymentWallet is Wallet, ERC20Wallet, DelayedPayment {
    constructor(address _targetUser, uint _transferThresholdWei, uint _transferDelaySeconds) public
        DelayedPayment(_targetUser, _transferThresholdWei, _transferDelaySeconds) {
    }

    function execute(address _to, uint _value, bytes) external returns (bytes32) {
        sendFunds(_to, _value);
        return keccak256(abi.encodePacked(msg.data, block.number));
    }
}
