import axios from "axios";

const JUP_URl = "https://lite-api.jup.ag"

const SLIPPAGE = 5;

//@params qty - with decimals // 1 SOL => qty: 1000_000_000
export async function swap(inputMint: string, outputMint: string, qty: number, publicKey: string) {

    let quoteConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${JUP_URl}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${qty}&slippageBps=${SLIPPAGE}&userPublicKey=${publicKey}`,
        headers: { 
            'Accept': 'application/json'
        }
    };
  
    const response = await axios.request(quoteConfig)

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://lite-api.jup.ag/swap/v1/swap`,
        headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json'
        },
        data : {quoteResponse: response.data, payer: publicKey, userPublicKey: publicKey}
    };

    const swapResponse = await axios.request(config);
    
    return swapResponse.data.swapTransaction;
}

