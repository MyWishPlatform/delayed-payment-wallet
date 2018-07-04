const BigNumber = web3.BigNumber;

const DelayedPaymentWallet = artifacts.require('./DelayedPaymentWallet.sol');

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { snapshot, revert } = require('sc-library/test-utils/evmMethods');
const { web3async } = require('sc-library/test-utils/web3Utils');
const getBalance = (address) => web3async(web3.eth, web3.eth.getBalance, address);

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

contract('DelayedPaymentWallet', function (accounts) {
    const TARGET = accounts[1];
    const RECIPIENT_1 = accounts[2];

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#1 construct', async () => {
        const contract = await DelayedPaymentWallet.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        contract.address.should.have.length(42);
    });

    it('#2 execute less than threshold', async () => {
        const contract = await DelayedPaymentWallet.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.execute(RECIPIENT_1, web3.toWei(0.5, 'ether'), '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.sub(balanceBefore).should.be.bignumber.equal(web3.toWei(0.5, 'ether'));
    });

    it('#3 execute more than threshold', async () => {
        const contract = await DelayedPaymentWallet.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.execute(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.should.be.bignumber.equal(balanceBefore);
        (await contract.queueSize()).should.be.bignumber.equal(1);
    });
});
