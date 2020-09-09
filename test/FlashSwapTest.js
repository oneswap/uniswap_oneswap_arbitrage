const uniswapFactory = artifacts.require("UniswapV2Factory");
const uniswapPair = artifacts.require("UniswapV2Pair");
const oneswapFactory = artifacts.require("OneSwapFactoryPXYTEST");
const Ones = artifacts.require("OneSwapToken");
const pairCon = artifacts.require("OneSwapPair");
const FlashSwap = artifacts.require("FlashSwap");
const WETH9 = artifacts.require("WETH9");

contract("test flash swap with oneswap", async (accounts)=>{
    before(async()=>{
        uniswap = await uniswapFactory.deployed();
        oneswap = await oneswapFactory.deployed();
        weth = await WETH9.deployed();
        ones = await Ones.new("ones", "ones", 100_0000_0000, 18);
        usdt = await Ones.new("usdt", "usdt", 100_0000_0000, 18);
        console.log('ones address:',ones.address);
        console.log('usdt address:',usdt.address);
    });

    it("create uniswap pair & add liquidity",async () =>{
        result = await uniswap.createPair(ones.address,usdt.address);
        uniswapp = await uniswapPair.at(result.logs[0].args[2]);
        console.log('uniswap pair address:',uniswapp.address);
        let onesToAdd = 10000;
        await ones.transfer(uniswapp.address,onesToAdd);
        await usdt.transfer(uniswapp.address,100*onesToAdd);
        await uniswapp.mint(accounts[1]);
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        onesIsToken0 = false;
        if (ones.address<usdt.address){
            onesIsToken0 = true;
        }
        if (onesIsToken0){
            assert.equal(reserves[0].toNumber(),onesToAdd);
            assert.equal(reserves[1].toNumber(),100*onesToAdd);
        }else{
            assert.equal(reserves[1].toNumber(),onesToAdd);
            assert.equal(reserves[0].toNumber(),100*onesToAdd);
        }
    });

   it("create oneswap pair & add liquidity", async ()=>{
       impl = await pairCon.new();
       result = await oneswap.createPair(ones.address, usdt.address, impl.address);
       pairAddr = result.logs[0].args.pair;
       console.log("oneswap pair address: ", pairAddr)
       oneswapp = await pairCon.at(pairAddr)

       let onesToAdd = 10000;
       await ones.transfer(oneswapp.address,onesToAdd);
       await usdt.transfer(oneswapp.address,400*onesToAdd);
       await oneswapp.mint(accounts[1]);
       reserves = await oneswapp.getReserves();
       console.log(reserves[0],reserves[1]);
       assert.equal(reserves[0].toNumber(),onesToAdd);
       assert.equal(reserves[1].toNumber(),400*onesToAdd);
   });

   it("create flashswap contracts",async()=>{
        flashSwap = await FlashSwap.new(uniswap.address,oneswap.address,weth.address);
        console.log(flashSwap.address);
   });

   it("flashswap with oneswap", async ()=>{
       reserves = await uniswapp.getReserves();
       console.log(reserves[0],reserves[1]);

       balance = await usdt.balanceOf(accounts[1]);
       console.log(balance);

       bytes = web3.eth.abi.encodeParameters(['bool','bool'],[onesIsToken0,false]);
       if (onesIsToken0){
           await uniswapp.swap(100,0,flashSwap.address,bytes,{from:accounts[1]});
       }else{
           await uniswapp.swap(0,100,flashSwap.address,bytes,{from:accounts[1]});
       }
       reserves = await uniswapp.getReserves();
       console.log(reserves[0],reserves[1]);
       balance = await usdt.balanceOf(accounts[1]);
       console.log(balance);
   })

})

contract("test flash swap with oneswap of eth pair", async (accounts)=>{
    before(async()=>{
        uniswap = await uniswapFactory.deployed();
        oneswap = await oneswapFactory.deployed();
        weth = await WETH9.deployed();
        ones = await Ones.new("ones", "ones", 100_0000_0000, 18);
        console.log('ones address:',ones.address);
        console.log('weth address:',weth.address);
    });

    it("create uniswap pair & add liquidity",async () =>{
        result = await uniswap.createPair(ones.address,weth.address);
        uniswapp = await uniswapPair.at(result.logs[0].args[2]);
        console.log('uniswap pair address:',uniswapp.address);
        let onesToAdd = 10000;
        await ones.transfer(uniswapp.address,onesToAdd);
        await weth.deposit({value:100*onesToAdd});
        await weth.transfer(uniswapp.address,100*onesToAdd);
        await uniswapp.mint(accounts[1]);
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        onesIsToken0 = false;
        if (ones.address<weth.address){
            onesIsToken0 = true;
        }
        if (onesIsToken0){
            assert.equal(reserves[0].toNumber(),onesToAdd);
            assert.equal(reserves[1].toNumber(),100*onesToAdd);
        }else{
            assert.equal(reserves[1].toNumber(),onesToAdd);
            assert.equal(reserves[0].toNumber(),100*onesToAdd);
        }
    });

    it("create oneswap pair & add liquidity", async ()=>{
        impl = await pairCon.new();
        result = await oneswap.createPair(ones.address, '0x0000000000000000000000000000000000000000', impl.address);
        pairAddr = result.logs[0].args.pair;
        console.log("oneswap pair address: ", pairAddr)
        oneswapp = await pairCon.at(pairAddr)

        let onesToAdd = 10000;
        await ones.transfer(oneswapp.address,onesToAdd);
        await web3.eth.sendTransaction({from:accounts[0],to:oneswapp.address,value:400*onesToAdd});
        await oneswapp.mint(accounts[1]);
        reserves = await oneswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        assert.equal(reserves[0].toNumber(),onesToAdd);
        assert.equal(reserves[1].toNumber(),400*onesToAdd);
    });

    it("create flashswap contracts",async()=>{
        flashSwap = await FlashSwap.new(uniswap.address,oneswap.address,weth.address);
        console.log(flashSwap.address);
    });

    it("flashswap with oneswap", async ()=>{
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);

        balance = await web3.eth.getBalance(accounts[1]);
        console.log(balance);

        bytes = web3.eth.abi.encodeParameters(['bool','bool'],[onesIsToken0,false]);
        if (onesIsToken0){
            result = await uniswapp.swap(100,0,flashSwap.address,bytes,{from:accounts[1]});
            console.log(result.logs)
        }else{
            await uniswapp.swap(0,100,flashSwap.address,bytes,{from:accounts[1]});
        }
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        balance = await web3.eth.getBalance(accounts[1]);
        console.log(balance);
    })

})

contract("test flash swap with oneswap of eth pair", async (accounts)=>{
    before(async()=>{
        uniswap = await uniswapFactory.deployed();
        oneswap = await oneswapFactory.deployed();
        weth = await WETH9.deployed();
        ones = await Ones.new("ones", "ones", 100_0000_0000, 18);
        console.log('ones address:',ones.address);
        console.log('weth address:',weth.address);
    });

    it("create uniswap pair & add liquidity",async () =>{
        result = await uniswap.createPair(ones.address,weth.address);
        uniswapp = await uniswapPair.at(result.logs[0].args[2]);
        console.log('uniswap pair address:',uniswapp.address);
        let onesToAdd = 10000;
        await ones.transfer(uniswapp.address,onesToAdd);
        await weth.deposit({value:400*onesToAdd});
        await weth.transfer(uniswapp.address,400*onesToAdd);
        await uniswapp.mint(accounts[1]);
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        onesIsToken0 = false;
        if (ones.address<weth.address){
            onesIsToken0 = true;
        }
        if (onesIsToken0){
            assert.equal(reserves[0].toNumber(),onesToAdd);
            assert.equal(reserves[1].toNumber(),400*onesToAdd);
        }else{
            assert.equal(reserves[1].toNumber(),onesToAdd);
            assert.equal(reserves[0].toNumber(),400*onesToAdd);
        }
    });

    it("create oneswap pair & add liquidity", async ()=>{
        impl = await pairCon.new();
        result = await oneswap.createPair(ones.address, '0x0000000000000000000000000000000000000000', impl.address);
        pairAddr = result.logs[0].args.pair;
        console.log("oneswap pair address: ", pairAddr)
        oneswapp = await pairCon.at(pairAddr)

        let onesToAdd = 10000;
        await ones.transfer(oneswapp.address,onesToAdd);
        await web3.eth.sendTransaction({from:accounts[0],to:oneswapp.address,value:100*onesToAdd});
        await oneswapp.mint(accounts[1]);
        reserves = await oneswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        assert.equal(reserves[0].toNumber(),onesToAdd);
        assert.equal(reserves[1].toNumber(),100*onesToAdd);
    });

    it("create flashswap contracts",async()=>{
        flashSwap = await FlashSwap.new(uniswap.address,oneswap.address,weth.address);
        console.log(flashSwap.address);
    });

    it("flashswap with oneswap", async ()=>{
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);

        balance = await ones.balanceOf(accounts[1]);
        console.log(balance);

        bytes = web3.eth.abi.encodeParameters(['bool','bool'],[onesIsToken0,false]);
        if (onesIsToken0){
            result = await uniswapp.swap(0,400,flashSwap.address,bytes,{from:accounts[1]});
            console.log(result.logs)
        }else{
            await uniswapp.swap(400,0,flashSwap.address,bytes,{from:accounts[1]});
        }
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);
        balance = await ones.balanceOf(accounts[1]);
        console.log(balance);
    })

})