import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';


const bot = new Telegraf(process.env.BTELEGRAM_BOT_TOKENOT_TOKEN!)

bot.start((ctx) => {
    
    ctx.reply(`Welcome to the 100xSchool Bot. Here is your public key ${publicKey}. 
        You can trade on solana now. `)
})

bot.launch()
