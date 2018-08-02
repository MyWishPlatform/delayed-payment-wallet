pragma solidity ^0.4.23;

import "last-will/contracts/LastWill.sol";
import "sc-library/contracts/wallet/ERC20Wallet.sol";


contract LostKeyERC20Wallet is LastWill, ERC20Wallet {
    uint64 public lastOwnerActivity;
    uint64 public noActivityPeriod;

    event Withdraw(address _sender, uint amount, address _beneficiary);

    constructor(address _targetUser, address[] _recipients, uint[] _percents, uint64 _noActivityPeriod) public
        LastWill(_targetUser, _recipients, _percents)
    {
        noActivityPeriod = _noActivityPeriod;
        lastOwnerActivity = uint64(block.timestamp);
    }

    function sendFunds(uint _amount, address _receiver, bytes _data) external onlyTarget onlyAlive {
        sendFundsInternal(_amount, _receiver, _data);
    }

    function sendFunds(uint _amount, address _receiver) external onlyTarget onlyAlive {
        sendFundsInternal(_amount, _receiver, "");
    }

    function check() public payable {
        // we really do not need payable in this implementation
        require(msg.value == 0);
        super.check();
    }

    function tokenTransfer(address _token, address _to, uint _value) public onlyTarget returns (bool success) {
        updateLastActivity();
        return super.tokenTransfer(_token, _to, _value);
    }

    function tokenTransferFrom(
        address _token,
        address _from,
        address _to,
        uint _value
    ) public onlyTarget returns (bool success) {
        updateLastActivity();
        return super.tokenTransferFrom(_token, _from, _to, _value);
    }

    function tokenApprove(address _token, address _spender, uint256 _value) public onlyTarget returns (bool success) {
        updateLastActivity();
        return super.tokenApprove(_token, _spender, _value);
    }

    function internalCheck() internal returns (bool) {
        bool result = block.timestamp > lastOwnerActivity && (block.timestamp - lastOwnerActivity) >= noActivityPeriod;
        emit Checked(result);
        return result;
    }

    function updateLastActivity() internal {
        lastOwnerActivity = uint64(block.timestamp);
    }

    function sendFundsInternal(uint _amount, address _receiver, bytes _data) internal {
        require(address(this).balance >= _amount);
        require(_receiver != 0);
        if (_data.length == 0) {
            require(_receiver.send(_amount));
        } else {
            require(_receiver.call.value(_amount)(_data));
        }

        emit Withdraw(msg.sender, _amount, _receiver);
        updateLastActivity();
    }
}
