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

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
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
        await contract.sendFunds(RECIPIENT_1, web3.toWei(0.5, 'ether'), { from: TARGET });
    });

    it('#4', async () => {
        // const contract = await DelayedPayment.new(TARGET, web3.toWei(1, 'ether'), 2 * DAY);
        // await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        // await contrac
    });
});
