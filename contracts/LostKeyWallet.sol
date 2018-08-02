pragma solidity ^0.4.23;

import "sc-library/contracts/wallet/Wallet.sol";
import "./LostKeyERC20Wallet.sol";


contract LostKeyWallet is Wallet, LostKeyERC20Wallet {
    constructor(address _targetUser, address[] _recipients, uint[] _percents, uint64 _noActivityPeriod) public
        LostKeyERC20Wallet(_targetUser, _recipients, _percents, _noActivityPeriod) {
    }

    function execute(address _to, uint _value, bytes _data) external onlyTarget returns (bytes32) {
        sendFundsInternal(_value, _to, _data);
        return keccak256(abi.encodePacked(msg.data, block.number));
    }
}
