const LostKeyWallet = artifacts.require('./LostKeyWallet.sol');

module.exports = function (deployer, _, accounts) {
    const TARGET = accounts[1];
    deployer.deploy(LostKeyWallet, TARGET, [TARGET], [100], 120);
};
