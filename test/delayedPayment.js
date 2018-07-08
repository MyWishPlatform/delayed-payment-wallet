const BigNumber = web3.BigNumber;

const DelayedPayment = artifacts.require('./DelayedPayment.sol');

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

contract('DelayedPayment', function (accounts) {
    const TARGET = accounts[1];
    const RECIPIENT_1 = accounts[2];

    let now;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        const block = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        now = block.timestamp;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#1 construct', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        contract.address.should.have.length(42);
    });

    it('#2 add funds', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.addFunds({ value: web3.toWei(1, 'ether') });
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        await contract.kill({ from: TARGET });
        await contract.addFunds({ value: web3.toWei(1, 'ether') }).should.eventually.be.rejected;
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') }).should.eventually.be.rejected;
    });

    it('#3 send less than threshold', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.sendFunds(RECIPIENT_1, web3.toWei(0.5, 'ether'), { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.sub(balanceBefore).should.be.bignumber.equal(web3.toWei(0.5, 'ether'));
    });

    it('#4 send more than threshold', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_1);
        balanceAfter.should.be.bignumber.equal(balanceBefore);
        (await contract.queueSize()).should.be.bignumber.equal(1);
    });

    it('#5 delayed tx can be found in queue', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        const tx = await contract.getTransaction(now + 2 * DAY);
        tx[0].should.be.equals(RECIPIENT_1);
        tx[1].should.be.bignumber.equals(web3.toWei(1.5, 'ether'));
        tx[2].should.be.bignumber.equals(now + 2 * DAY);
    });

    it('#6 delayed tx sended', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_1);
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        await increaseTime(3 * DAY);
        (await contract.sendDelayedTransactions()).should.be.fulfilled;
    });

    it('#7 reject delayed transaction', async () => {
        const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        await contract.sendTransaction({ value: web3.toWei(2, 'ether') });
        await contract.sendFunds(RECIPIENT_1, web3.toWei(1.5, 'ether'), { from: TARGET });
        (await contract.queueSize()).should.be.bignumber.equal(1);
        const tx = await contract.getTransaction(now + 2 * DAY);
        (await contract.reject(tx[0], tx[1], tx[2])).should.be.fulfilled;
    });
});
