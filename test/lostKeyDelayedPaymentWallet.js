const BigNumber = web3.BigNumber;

const LostKeyDelayedPaymentWallet = artifacts.require('./LostKeyDelayedPaymentWallet.sol');

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { increaseTime, snapshot, revert } = require('sc-library/test-utils/evmMethods');
const { web3async } = require('sc-library/test-utils/web3Utils');
const getBalance = (address) => web3async(web3.eth, web3.eth.getBalance, address);

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

contract('LostKeyDelayedPaymentWallet', accounts => {
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
        const contract = await LostKeyDelayedPaymentWallet.new(TARGET, [TARGET], [100], 120, 0, 0);
        contract.address.should.have.length(42);
    });

    it('#2 add funds', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        await contract.kill({ from: TARGET });
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') }).should.eventually.be.rejected;
    });

    it('#3 send less than threshold', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.sendFunds(RECIPIENT_1, web3.toWei(0.5, 'ether'), '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.sub(balanceBefore).should.be.bignumber.equal(web3.toWei(0.5, 'ether'));
    });

    it('#4 send more than threshold', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.should.be.bignumber.equal(balanceBefore);
        (await contract.queueSize()).should.be.bignumber.equal(1);
    });

    it('#5 delayed tx can be found in queue', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        const tx = await contract.getTransaction(0);
        tx[0].should.be.equals(RECIPIENT_1);
        tx[1].should.be.bignumber.equals(web3.toWei(1.5, 'ether'));
        tx[3].should.not.be.bignumber.equal(0);
    });

    it('#6 check delaying tx', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(3, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        await increaseTime(0.5 * DAY);
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        await increaseTime(2 * DAY);
        const tx1 = await contract.getTransaction(0);
        const tx2 = await contract.getTransaction(1);
        await contract.sendDelayedTransactions();

        const newtx1 = await contract.getTransaction(0);
        const newtx2 = await contract.getTransaction(1);

        tx1[3].should.be.bignumber.lessThan(tx2[3]);
        newtx1[0].should.be.equals(tx2[0]);
        newtx1[1].should.be.bignumber.equals(tx2[1]);
        newtx1[3].should.be.bignumber.equals(tx2[3]);
        newtx2[0].should.be.equals('0x0000000000000000000000000000000000000000');
        newtx2[1].should.be.bignumber.equal(0);
        newtx2[3].should.be.bignumber.equal(0);
    });

    it('#7 delayed tx sended', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        await increaseTime(3 * DAY);
        await contract.sendDelayedTransactions().should.be.fulfilled;
        (await contract.queueSize()).should.be.bignumber.equal(0);
    });

    it('#8 reject delayed transaction', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        const tx = await contract.getTransaction(0);
        await contract.reject(tx[0], tx[1], '', tx[3], { from: TARGET })
            .should.be.fulfilled;
    });

    it('#9 try to reject delayed tx not from target', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        const tx = await contract.getTransaction(0);
        await contract.reject(tx[0], tx[1], '', tx[3]).should.be.rejected;
    });

    it('#10 send less than threshold with execute', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.execute(RECIPIENT_1, web3.toWei(0.5, 'ether'), '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.sub(balanceBefore).should.be.bignumber.equal(web3.toWei(0.5, 'ether'));
    });

    it('#11 send more than threshold with execute', async () => {
        const contract = await LostKeyDelayedPaymentWallet.new(
            TARGET, [TARGET], [100], 3 * DAY, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.execute(RECIPIENT_1, web3.toWei(1.5, 'ether'), '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.should.be.bignumber.equal(balanceBefore);
        (await contract.queueSize()).should.be.bignumber.equal(1);
    });
});
