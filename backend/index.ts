import { Telegraf, Markup } from "telegraf";
import { PrismaClient } from "./generated/prisma";
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from "@solana/web3.js";
import { getBalanceMessage } from "./solana";
import { swap } from "./jup";

const connection = new Connection(process.env.RPC_URL!);
const prismaClient = new PrismaClient();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

const PENDING_USER_BUYS: Record<
  string,
  { isPending: boolean; mint?: string }
> = {};

const DEFAULT_KEYBOARD = Markup.inlineKeyboard([
  [
    Markup.button.callback("Show Public Key", "public_key"),
    Markup.button.callback("Show Private Key", "private_key"),
  ],
  [
    Markup.button.callback("Buy", "buy"),
    Markup.button.callback("Transactions", "transactions"),
  ],
]);

// /start
bot.start(async (ctx) => {
  const existingUser = await prismaClient.users.findFirst({
    where: { tgUserId: ctx.chat.id.toString() },
  });

  if (existingUser) {
    const publicKey = existingUser.publicKey;
    const { empty, message } = await getBalanceMessage(publicKey);
    ctx.reply(
      `Welcome to the 100xSchool Bot.\nYour public key: ${publicKey}\n\n${
        empty
          ? "Your wallet is empty, please fund it to trade on SOL."
          : message
      }`,
      { ...DEFAULT_KEYBOARD }
    );
  } else {
    const keypair = Keypair.generate();
    await prismaClient.users.create({
      data: {
        tgUserId: ctx.chat.id.toString(),
        publicKey: keypair.publicKey.toBase58(),
        privateKey: Buffer.from(keypair.secretKey).toString("base64"),
      },
    });
    ctx.reply(
      `Wallet created successfully! 💼\nPublic Key: ${keypair.publicKey.toBase58()}\n\nFund it with some SOL to start trading.`,
      { ...DEFAULT_KEYBOARD }
    );
  }
});

// Show Public Key
bot.action("public_key", async (ctx) => {
  const user = await prismaClient.users.findFirst({
    where: { tgUserId: ctx.chat?.id.toString() },
  });

  if (!user)
    return ctx.reply("User not found. Please /start to create your wallet.");

  const { empty, message } = await getBalanceMessage(user.publicKey);
  ctx.reply(
    `Your public key is: ${user.publicKey}\n${
      empty ? "Fund your wallet to trade." : message
    }`,
    { ...DEFAULT_KEYBOARD }
  );
});

// Show Private Key
bot.action("private_key", async (ctx) => {
  const user = await prismaClient.users.findFirst({
    where: { tgUserId: ctx.chat?.id.toString() },
  });

  if (!user)
    return ctx.reply("User not found. Please /start to create your wallet.");

  ctx.reply(`Your private key is:\n${user.privateKey}`, {
    ...DEFAULT_KEYBOARD,
  });
});

//Buy Flow
bot.action("buy", async (ctx) => {
  PENDING_USER_BUYS[ctx.chat?.id!] = { isPending: true };
  return ctx.reply("What token mint do you want to buy?");
});

//Show Transaction History
bot.action("transactions", async (ctx) => {
  const user = await prismaClient.users.findFirst({
    where: { tgUserId: ctx.chat?.id.toString() },
  });

  if (!user)
    return ctx.reply("User not found. Please /start to create your wallet.");

  const transactions = await prismaClient.transactionHistory.findMany({
    where: { tgUserId: ctx.chat?.id.toString() },
    orderBy: { timeStamp: "desc" },
    take: 5,
  });

  if (transactions.length === 0) {
    return ctx.reply("You have no past transactions yet.", {
      ...DEFAULT_KEYBOARD,
    });
  }

  let historyMessage = "Your last 5 transactions:\n\n";
  for (const tx of transactions) {
    historyMessage += `🔹 *${tx.transType.toUpperCase()}*\n`;
    historyMessage += `Input: ${tx.inputTokenMint.slice(0, 6)}... → Output: ${tx.outputTokenMint.slice(0, 6)}...\n`;
    historyMessage += `Amount: ${(tx.inputAmount / LAMPORTS_PER_SOL).toFixed(
      3
    )} SOL\n`;
    historyMessage += `${tx.timeStamp.toLocaleString()}\n`;
    historyMessage += `[View on Solscan](${tx.explorerLink})\n\n`;
  }

  ctx.replyWithMarkdown(historyMessage, { ...DEFAULT_KEYBOARD });
});


bot.on("text", async (ctx) => {
  try {
    const message = ctx.message.text;
    const user = await prismaClient.users.findFirst({
      where: { tgUserId: ctx.chat?.id.toString() },
    });

    if (!user) {
      ctx.reply("User not found. Please /start to create your wallet.");
      return;
    }

    const userKeypair = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(user.privateKey, "base64"))
    );

    if (PENDING_USER_BUYS[ctx.chat.id]?.isPending && !PENDING_USER_BUYS[ctx.chat.id].mint) {
      PENDING_USER_BUYS[ctx.chat.id].mint = message;
      ctx.reply("What quantity (in SOL) do you want to buy?");
    } else if (
      PENDING_USER_BUYS[ctx.chat.id]?.isPending &&
      PENDING_USER_BUYS[ctx.chat.id].mint
    ) {
      const { swapTransaction, outAmount } = await swap(
        "So11111111111111111111111111111111111111112", 
        PENDING_USER_BUYS[ctx.chat.id].mint!, 
        Number(message) * LAMPORTS_PER_SOL,
        user.publicKey
      );

      console.log("Swap Transaction:", swapTransaction);

      const tx = VersionedTransaction.deserialize(
        Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0))
      );
      tx.sign([userKeypair]);
      const sign = await connection.sendTransaction(tx);
      const explorer = `https://solscan.io/tx/${sign}`;

      ctx.reply(`Swap successful!\nTrack it here:\n${explorer}`);

      // Save transaction log
      await prismaClient.transactionHistory.create({
        data: {
          tgUserId: ctx.chat.id.toString(),
          transType: "swap",
          inputTokenMint: "So11111111111111111111111111111111111111112",
          outputTokenMint: PENDING_USER_BUYS[ctx.chat.id].mint!,
          inputAmount: Number(message) * LAMPORTS_PER_SOL,
          outputAmount: outAmount,
          status: "success",
          explorerLink: explorer,
          timeStamp: new Date(),
        },
      });

      delete PENDING_USER_BUYS[ctx.chat.id];
    }
  } catch (e) {
    console.error(e);
    ctx.reply("Error while performing swap. Please try again later.");
  }
});

bot.launch();
console.log("Bot is running...");