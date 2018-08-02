const LostKeyWallet = artifacts.require('./LostKeyERC20Wallet.sol');

module.exports = function (deployer, _, accounts) {
    const TARGET = accounts[1];
    deployer.deploy(LostKeyWallet, TARGET, [TARGET], [100], 120);
};
