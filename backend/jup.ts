import axios from "axios";

const JUP_URL = "https://lite-api.jup.ag";
const SLIPPAGE = 5;

// qty with decimals (1 SOL = 1000000000 lamports)
export async function swap(
  inputMint: string,
  outputMint: string,
  qty: number,
  publicKey: string
) {
  try {
    const quoteUrl = `${JUP_URL}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${qty}&slippageBps=${SLIPPAGE}&userPublicKey=${publicKey}`;
    const quoteResponse = await axios.get(quoteUrl, {
      headers: { Accept: "application/json" },
      maxBodyLength: Infinity,
    });

    const swapResponse = await axios.post(
      `${JUP_URL}/swap/v1/swap`,
      {
        quoteResponse: quoteResponse.data,
        payer: publicKey,
        userPublicKey: publicKey,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        maxBodyLength: Infinity,
      }
    );

    return {
      swapTransaction: swapResponse.data.swapTransaction,
      outAmount: quoteResponse.data.outAmount,
    };
  } catch (error: any) {
    console.error("Swap Error:", error.response?.data || error.message);
    throw error;
  }
}
