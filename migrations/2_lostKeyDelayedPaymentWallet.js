const LostKeyDelayedPaymentWallet = artifacts.require('./LostKeyDelayedPaymentWallet.sol');

module.exports = function (deployer, _, accounts) {
    const TARGET = accounts[1];
    deployer.deploy(LostKeyDelayedPaymentWallet, TARGET, [TARGET], [100], 120, 0, 0);
};
