const BigNumber = web3.BigNumber;

const Queue = artifacts.require('./QueueTestContract.sol');

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { snapshot, revert } = require('sc-library/test-utils/evmMethods');
const { web3async } = require('sc-library/test-utils/web3Utils');

const SECOND = 1;
const MINUTE = 60 * SECOND;

contract('Queue', function (accounts) {
    const RECIPIENT_1 = accounts[2];
    const RECIPIENT_2 = accounts[3];

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
        const queue = await Queue.new();
        queue.address.should.have.length(42);
    });

    it('#2 push once and check size', async () => {
        const queue = await Queue.new();
        await queue.isEmpty().should.eventually.be.true;
        (await queue.size()).should.be.bignumber.equal(0);
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(1);
    });

    it('#3 push twice and check size', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(2);
    });

    it('#4 push three times and check size', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        await queue.push(RECIPIENT_1, 1000, '0xcc', now + 2 * MINUTE);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(3);
    });

    it('#5 push four times and check size', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        await queue.push(RECIPIENT_1, 1000, '0xcc', now + 2 * MINUTE);
        await queue.push(RECIPIENT_1, 1000, '0xdd', now + 3 * MINUTE);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(4);
    });

    it('#6 push twice same txs', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now).should.eventually.be.rejected;
    });

    it('#7 push & peek', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);

        let peek = await queue.peek();
        peek[0].should.be.equals(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0xaa');
        peek[3].should.be.bignumber.equal(now);

        await queue.push(RECIPIENT_1, 1000, '0xbb', now + 2 * MINUTE);
        peek = await queue.peek();
        peek[3].should.be.bignumber.equal(now);

        await queue.push(RECIPIENT_1, 1000, '0xcc', now + 3 * MINUTE);
        peek = await queue.peek();
        peek[3].should.be.bignumber.equal(now);
    });

    it('#8 push & pop', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);

        const pop = await queue.pop.call();
        await queue.pop();

        pop[0].should.be.equals(RECIPIENT_1);
        pop[1].should.be.bignumber.equal(1000);
        pop[2].should.be.equal('0xaa');
        pop[3].should.be.bignumber.equal(now);
        await queue.isEmpty().should.eventually.be.true;
        (await queue.size()).should.be.bignumber.equal(0);
    });

    it('#9 twice push & pop', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);

        let pop = await queue.pop.call();
        await queue.pop();
        pop[0].should.be.equals(RECIPIENT_1);
        pop[1].should.be.bignumber.equal(1000);
        pop[2].should.be.equal('0xaa');
        pop[3].should.be.bignumber.equal(now);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(1);

        pop = await queue.pop.call();
        await queue.pop();
        pop[0].should.be.equals(RECIPIENT_1);
        pop[1].should.be.bignumber.equal(1000);
        pop[2].should.be.equal('0xbb');
        pop[3].should.be.bignumber.equal(now + MINUTE);
        await queue.isEmpty().should.eventually.be.true;
        (await queue.size()).should.be.bignumber.equal(0);
    });

    it('#10 push & pop & push', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.pop();
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0xbb');
        peek[3].should.be.bignumber.equal(now + MINUTE);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(1);
    });

    it('#11 push & push & pop & push', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        await queue.pop();
        await queue.push(RECIPIENT_1, 1000, '0xcc', now + 2 * MINUTE);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0xbb');
        peek[3].should.be.bignumber.equal(now + MINUTE);
        await queue.isEmpty().should.eventually.be.false;
        (await queue.size()).should.be.bignumber.equal(2);
    });

    it('#12 push & remove & push', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.remove(RECIPIENT_1, 1000, '0xbb', now);
        await queue.isEmpty().should.eventually.be.true;

        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0xaa');
        peek[3].should.be.bignumber.equal(now);
        (await queue.size()).should.be.bignumber.equal(1);
    });

    it('#13 push & push & remove', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        await queue.remove(RECIPIENT_1, 1000, '0xaa', now);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0xbb');
        peek[3].should.be.bignumber.equal(now + MINUTE);
        (await queue.size()).should.be.bignumber.equal(1);
    });

    it('#14 push & push & remove & push', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xbb', now + MINUTE);
        await queue.remove(RECIPIENT_1, 1000, '0xaa', now);
        await queue.push(RECIPIENT_1, 1000, '0xcc', now + 2 * MINUTE);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0xbb');
        peek[3].should.be.bignumber.equal(now + MINUTE);
        (await queue.size()).should.be.bignumber.equal(2);
    });

    it('#15 remove head', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0x11', now);
        await queue.push(RECIPIENT_1, 1000, '0x12', now + MINUTE);
        await queue.push(RECIPIENT_1, 1000, '0x13', now + 2 * MINUTE);
        await queue.remove(RECIPIENT_1, 1000, '0x11', now);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0x12');
        peek[3].should.be.bignumber.equal(now + MINUTE);
        (await queue.size()).should.be.bignumber.equal(2);
    });

    it('#16 remove tail', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0x01', now);
        await queue.push(RECIPIENT_1, 1000, '0x02', now + MINUTE);
        await queue.push(RECIPIENT_1, 1000, '', now + 2 * MINUTE);
        await queue.remove(RECIPIENT_1, 1000, '', now + 2 * MINUTE);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0x01');
        peek[3].should.be.bignumber.equal(now);
        (await queue.size()).should.be.bignumber.equal(2);
    });

    it('#17 remove middle', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '', now);
        await queue.push(RECIPIENT_1, 1000, '', now + MINUTE);
        await queue.push(RECIPIENT_1, 1000, '', now + 2 * MINUTE);
        await queue.remove(RECIPIENT_1, 1000, '', now + MINUTE);
        const peek = await queue.peek();
        peek[0].should.be.equal(RECIPIENT_1);
        peek[1].should.be.bignumber.equal(1000);
        peek[2].should.be.equal('0x');
        peek[3].should.be.bignumber.equal(now);
        (await queue.size()).should.be.bignumber.equal(2);
    });

    it('#18 get first transaction', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0x11', now);
        const tx = await queue.getTransaction(0);
        tx[0].should.be.equal(RECIPIENT_1);
        tx[1].should.be.bignumber.equal(1000);
        tx[2].should.be.equal('0x11');
        tx[3].should.not.be.bignumber.equal(0);
        (await queue.size()).should.be.bignumber.equal(1);
    });

    it('#19 get transaction if more than two in queue', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '', now);
        await queue.push(RECIPIENT_2, 1000, '', now + MINUTE);
        (await queue.size()).should.be.bignumber.equal(2);
        const tx1 = await queue.getTransaction(0);
        const tx2 = await queue.getTransaction(1);
        tx1[0].should.be.equal(RECIPIENT_1);
        tx1[1].should.be.bignumber.equal(1000);
        tx1[2].should.be.equal('0x');
        tx1[3].should.be.bignumber.equal(now);
        tx2[0].should.be.equal(RECIPIENT_2);
        tx2[1].should.be.bignumber.equal(1000);
        tx2[2].should.be.equal('0x');
        tx1[3].should.be.bignumber.lessThan(tx2[3]);
    });

    it('#20 try to get removed transaction', async () => {
        const queue = await Queue.new();
        await queue.push(RECIPIENT_1, 1000, '0xab', now);
        await queue.remove(RECIPIENT_1, 1000, '0xab', now);
        (await queue.size()).should.be.bignumber.equal(0);
        const emptyTx = await queue.getTransaction(0);
        emptyTx[0].should.not.be.equal(RECIPIENT_1);
        emptyTx[1].should.be.bignumber.equal(0);
        emptyTx[2].should.be.equal('0x');
        emptyTx[3].should.be.bignumber.equal(0);
    });
});
