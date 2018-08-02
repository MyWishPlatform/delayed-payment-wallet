const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { snapshot, revert } = require('sc-library/test-utils/evmMethods');
const { web3async } = require('sc-library/test-utils/web3Utils');
const getBalance = (address) => web3async(web3.eth, web3.eth.getBalance, address);

const LostKeyWallet = artifacts.require('./LostKeyWallet.sol');

const SECOND = 1;
const MINUTE = 60 * SECOND;

contract('LostKeyWallet', function (accounts) {
    const TARGET = accounts[1];
    const RECIPIENT_1 = accounts[2];

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    // it('#1 construct', async () => {
    //     const contract = await LostKeyWallet.new(TARGET, [TARGET], [100], 2 * MINUTE);
    //     contract.address.should.have.length(42);
    // });
    //
    // it('#2 execute', async () => {
    //     const contract = await LostKeyWallet.new(TARGET, [RECIPIENT_1], [100], MINUTE);
    //     await contract.sendTransaction({ value: web3.toWei(1, 'ether') });
    //     const balanceBefore = await getBalance(RECIPIENT_1);
    //     await contract.execute(RECIPIENT_1, web3.toWei(1, 'ether'), '', { from: TARGET });
    //     const balanceAfter = await getBalance(RECIPIENT_1);
    //     balanceAfter.sub(balanceBefore).should.be.bignumber.equal(web3.toWei(1, 'ether'));
    // });
});
