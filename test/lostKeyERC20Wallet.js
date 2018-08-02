const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { increaseTime, snapshot, revert } = require('sc-library/test-utils/evmMethods');
const { web3async } = require('sc-library/test-utils/web3Utils');
const getBalance = (address) => web3async(web3.eth, web3.eth.getBalance, address);

const LostKeyERC20Wallet = artifacts.require('./LostKeyERC20Wallet.sol');
const SimpleToken = artifacts.require('./SimpleToken.sol');

const SECOND = 1;
const MINUTE = 60 * SECOND;

contract('LostKeyERC20Wallet', function (accounts) {
    const SERVICE_ACCOUNT = accounts[0];
    const TARGET = accounts[1];
    const RECIPIENT_1 = accounts[2];
    const RECIPIENT_2 = accounts[3];
    const RECIPIENT_3 = accounts[4];

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#1 construct', async () => {
        const contract = await LostKeyERC20Wallet.new(TARGET, [TARGET], [100], 2 * MINUTE);
        contract.address.should.have.length(42);
    });

    it('#2 successfully sending funds', async () => {
        const contract = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        const balanceBefore = await getBalance(RECIPIENT_2);

        await contract.sendFunds(web3.toWei(0.5, 'ether'), RECIPIENT_2, '', { from: TARGET });
        const balanceAfter = await getBalance(RECIPIENT_2);
        balanceAfter.sub(balanceBefore).should.be.bignumber.equal(web3.toWei(0.5, 'ether'));
    });

    it('#3 cannot send funds not by target', async () => {
        const contract = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });

        await contract.sendFunds(web3.toWei(0.5, 'ether'), RECIPIENT_2, '', { from: RECIPIENT_1 })
            .should.eventually.be.rejected;
    });

    it('#4 token balance', async () => {
        const wallet = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
        const token = await SimpleToken.new();
        await token.mint(wallet.address, 100);
        (await wallet.tokenBalanceOf(token.address)).should.be.bignumber.equal(100);
    });

    it('#5 token transfer', async () => {
        const wallet = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
        const token = await SimpleToken.new();
        await token.mint(wallet.address, 100);
        await wallet.tokenTransfer(token.address, RECIPIENT_1, 100, { from: RECIPIENT_1 })
            .should.eventually.be.rejected;
        await wallet.tokenTransfer(token.address, RECIPIENT_1, 100, { from: TARGET });
        (await token.balanceOf(RECIPIENT_1)).should.be.bignumber.equal(100);
    });

    it('#6 token approve', async () => {
        const wallet = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
        const token = await SimpleToken.new();
        await wallet.tokenApprove(token.address, RECIPIENT_1, 100, { from: RECIPIENT_1 })
            .should.eventually.be.rejected;
        await wallet.tokenApprove(token.address, RECIPIENT_1, 100, { from: TARGET });
        (await wallet.tokenAllowance(token.address, wallet.address, RECIPIENT_1)).should.be.bignumber.equal(100);
    });

    it('#7 token transferFrom', async () => {
        const wallet = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
        const token = await SimpleToken.new();
        await token.mint(RECIPIENT_1, 100);
        await token.approve(wallet.address, 100, { from: RECIPIENT_1 });
        await wallet.tokenTransferFrom(token.address, RECIPIENT_1, RECIPIENT_2, 100, { from: TARGET });
        (await token.balanceOf(RECIPIENT_2)).should.be.bignumber.equal(100);
    });

    it('#8 cannot check before time', async () => {
        const contract = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1, RECIPIENT_2], [50, 50], 10 * MINUTE);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });

        const tx = await contract.check({ from: SERVICE_ACCOUNT });
        tx.logs.length.should.be.equals(1);
        tx.logs[0].event.should.be.equals('Checked');
    });

    it('#9 cannot check not by service account', async () => {
        const contract = await LostKeyERC20Wallet.new(TARGET, [RECIPIENT_1, RECIPIENT_2], [50, 50], 10 * MINUTE);
        await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
        await contract.check({ from: RECIPIENT_1 }).should.eventually.be.rejected;
    });

    it('#10 successfully sent funds after check', async () => {
        const allFunds = web3.toWei(1, 'ether');

        const recipients = [RECIPIENT_1, RECIPIENT_2, RECIPIENT_3];
        const percents = [30, 10, 60];

        const contract = await LostKeyERC20Wallet.new(TARGET, recipients, percents, 10 * MINUTE);
        await contract.sendTransaction({ value: allFunds });
        await increaseTime(15 * MINUTE);
        const balancesBefore = await Promise.all(recipients.map((recipient) => getBalance(recipient)));

        const tx = await contract.check({ from: SERVICE_ACCOUNT });
        tx.logs.length.should.be.equals(5);
        tx.logs[0].event.should.be.equals('Checked');
        tx.logs[1].event.should.be.equals('Triggered');
        tx.logs[2].event.should.be.equals('FundsSent');
        tx.logs[3].event.should.be.equals('FundsSent');
        tx.logs[4].event.should.be.equals('FundsSent');
        const balancesAfter = await Promise.all(recipients.map((recipient) => getBalance(recipient)));

        for (let i = 0; i < recipients.length; i++) {
            balancesAfter[i].sub(balancesBefore[i])
                .should.be.bignumber.equal(allFunds * percents[i] / 100);
        }
    });

    it('#11 cannot set not 100 percents', async () => {
        await LostKeyERC20Wallet.new(TARGET, [TARGET], [90], MINUTE).should.eventually.be.rejected;
        await LostKeyERC20Wallet.new(TARGET, [TARGET], [110], MINUTE).should.eventually.be.rejected;
    });
});
