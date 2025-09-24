import { Telegraf, Markup } from "telegraf";
// import { message } from 'telegraf/filters';
import { PrismaClient } from "./generated/prisma";
import { Keypair, Connection, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getBalanceMessage } from "./solana";
import { swap } from "./jup";
import assert from "assert";

const connection = new Connection(process.env.RPC_URL!);

const prismaClient = new PrismaClient();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

const PENDING_USER_BUYS: Record<string, {
    isPending: boolean,
    mint?: string,
}> = {};

const DEFAULT_KEYBOARD = Markup.inlineKeyboard([[
    Markup.button.callback("Show public key", "public_key"),
    Markup.button.callback("Show Private key", "private_key"),    
], [
    Markup.button.callback("Buy", "buy"),
]]);


bot.start(async (ctx) => {
    const existingUser = await prismaClient.users.findFirst({
        where: {
            tgUserId: ctx.chat.id.toString()
        }
    })

    if (existingUser) {
        const publicKey = existingUser.publicKey;
        const {empty, message} = await getBalanceMessage(existingUser.publicKey.toString());


        ctx.reply(`Welcome to the 100xSchool Bot. Here is your public key ${publicKey}. 
        ${empty ? "Your wallet is empty please fund it to trade on SOL" : message}
        `, {
            ...DEFAULT_KEYBOARD
        })
    } else {
        const keypair = Keypair.generate();
        await prismaClient.users.create({
            data: {
                tgUserId: ctx.chat.id.toString(),
                publicKey: keypair.publicKey.toBase58(),
                privateKey: keypair.secretKey.toBase64()
            }
        })
        const publicKey = keypair.publicKey.toString();
        ctx.reply(`Welcome to the 100xSchool Bot. Here is your public key ${publicKey}. 
        You can trade on solana now. Put some SOL to trade.`, {
            ...DEFAULT_KEYBOARD
        })
    }
})

bot.action("public_key", async ctx => {
    const existingUser = await prismaClient.users.findFirst({
        where: {
            tgUserId: ctx.chat?.id.toString()
        }
    });

    const {empty, message} = await getBalanceMessage(existingUser.publicKey.toString());

	return ctx.reply(
		`Your public key is ${existingUser?.publicKey}. ${empty ? "Fund your wallet to trade" : message}`, {
            ...DEFAULT_KEYBOARD
        }
		
	);
});

bot.action("private_key", async ctx => {
    const user = await prismaClient.users.findFirst({
        where: {
            tgUserId: ctx.chat?.id.toString()
        }
    })
	return ctx.reply(
		`Your public key is ${user?.publicKey}`, {
            ...DEFAULT_KEYBOARD
        }
		
	);
});

bot.action("buy", async ctx => {
    PENDING_USER_BUYS[ctx.chat?.id!] = {
        isPending: true
    }
    return ctx.reply("What token mint do you want to buy");
})


bot.on('text', async (ctx) => {
    try {
        const message = ctx.message.text;
        const existingUser = await prismaClient.users.findFirst({
            where: {
                tgUserId: ctx.chat?.id.toString()
            }
        });
    
        console.log(existingUser);
    
        const userKeypair = Keypair.fromSecretKey(Uint8Array.from(atob(existingUser?.privateKey!), c => c.charCodeAt(0)))
    
        if (PENDING_USER_BUYS[ctx.chat.id]?.isPending && !PENDING_USER_BUYS[ctx.chat.id!].mint) {
            PENDING_USER_BUYS[ctx.chat.id!].mint = message;
            ctx.reply("What Quantity do you want to buy");
        } else if (PENDING_USER_BUYS[ctx.chat.id]?.isPending && PENDING_USER_BUYS[ctx.chat.id!].mint) {
            const swapTxn = await swap("So11111111111111111111111111111111111111112", PENDING_USER_BUYS[ctx.chat.id!].mint!, Number(message) * LAMPORTS_PER_SOL, existingUser?.publicKey!);
            console.log(swapTxn);
            const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(swapTxn), c => c.charCodeAt(0)));
            tx.sign([userKeypair]);
            const sign = await connection.sendTransaction(tx);
            delete PENDING_USER_BUYS[ctx.chat.id!];
            ctx.reply(`Swap successful, you can track it here https://solscan.io/tx/${sign}`);
        }
    } catch(e) {
        console.log(e);
        ctx.reply(`Error while doing a swap}`);
    }
   
});



bot.launch()
