const Factory = artifacts.require("UniswapV2Factory");
const Router = artifacts.require("UniswapV2Router02");
const WETH9 = artifacts.require("WETH9");

let ownerAddr = '0xee71C9C50eF8D692c8EE553A1ba130e43eDF3a17';
let weth9Addr = '0xC73eA7cc46151f4558D498541b1709a2bb9346Ff';

module.exports = async function (deployer, network, accounts) {
    console.log('owner:', accounts[0]);
    ownerAddr = accounts[0];
    if (network === "ropsten" || network === "mainnet") {
        //return;
    } else { // test
        await deployer.deploy(WETH9);
        weth9Addr = WETH9.address;
    }
    await deployer.deploy(Factory, ownerAddr);
    console.log('Factory:', Factory.address);
    await deployer.deploy(Router, Factory.address, weth9Addr);
    console.log('Router:', Router.address);
};