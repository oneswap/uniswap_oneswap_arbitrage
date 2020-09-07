const uniswapFactory = artifacts.require("UniswapV2Factory");
const uniswapPair = artifacts.require("UniswapV2Pair");
const oneswapFactory = artifacts.require("OneSwapFactoryPXYTEST");
const Ones = artifacts.require("OneSwapToken");
const pairCon = artifacts.require("OneSwapPair");
const FlashSwap = artifacts.require("FlashSwap");

contract("test flash swap with oneswap", async (accounts)=>{
    before(async()=>{
        uniswap = await uniswapFactory.deployed();
        oneswap = await oneswapFactory.deployed();
        ones = await Ones.new("ones", "ones", 100_0000_0000, 18);
        usdt = await Ones.new("usdt", "usdt", 100_0000_0000, 18);
        console.log(ones.address);
        console.log(usdt.address);
    });

    it("create uniswap pair & add liquidity",async () =>{
        result = await uniswap.createPair(ones.address,usdt.address);
        uniswapp = await uniswapPair.at(result.logs[0].args[2]);
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
       console.log("pairAddr: ", pairAddr)
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
        flashSwap = await FlashSwap.new(uniswap.address,oneswapp.address);
        console.log(flashSwap.address);
   });

   it("flashswap with oneswap", async ()=>{
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);

        bytes = new(Array);
        bytes.push(1);
        if (onesIsToken0){
            await uniswapp.swap(100,0,flashSwap.address,bytes);
        }else{
            await uniswapp.swap(0,100,flashSwap.address,bytes);
        }
        reserves = await uniswapp.getReserves();
        console.log(reserves[0],reserves[1]);
   })

})