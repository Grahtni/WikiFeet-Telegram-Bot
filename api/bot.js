require("dotenv").config();
const { Bot, webhookCallback, HttpError, GrammyError } = require("grammy");
const wikifeet = require("wikifeet-js");

// Bot

const bot = new Bot(process.env.BOT_TOKEN);

// DB

const mysql = require("mysql2");
const connection = mysql.createConnection(process.env.DATABASE_URL);

// Response

async function responseTime(ctx, next) {
  const before = Date.now();
  await next();
  const after = Date.now();
  console.log(`Response time: ${after - before} ms`);
}

bot.use(responseTime);

// Commands

bot.command("start", async (ctx) => {
  await ctx
    .reply("*Welcome!* ✨\n_Send the name of a celebrity._", {
      parse_mode: "Markdown",
    })
    .then(() => {
      connection.query(
        `
SELECT * FROM users WHERE userid = ?
`,
        [ctx.from.id],
        (error, results) => {
          if (error) throw error;
          if (results.length === 0) {
            connection.query(
              `
    INSERT INTO users (userid, username, firstName, lastName, firstSeen)
    VALUES (?, ?, ?, ?, NOW())
  `,
              [
                ctx.from.id,
                ctx.from.username,
                ctx.from.first_name,
                ctx.from.last_name,
              ],
              (error, results) => {
                if (error) throw error;
                console.log("New user added:", ctx.from);
              }
            );
          } else {
            console.log("User exists in database.", ctx.from);
          }
        }
      );
    })
    .catch((error) => console.error(error));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\n_This bot uses the WikiFeet website.\nSend the name of a celebrity to try it out!_",
      { parse_mode: "Markdown" }
    )
    .then(() => console.log("Help command message sent to", ctx.from.id))
    .catch((error) => console.error(error));
});

// Messages

bot.on("msg", async (ctx) => {
  try {
    // Logging
    const from = ctx.from;
    const name =
      from.last_name === undefined
        ? from.first_name
        : `${from.first_name} ${from.last_name}`;
    console.log(
      `From: ${name} (@${from.username}) ID: ${from.id}\nMessage: ${ctx.msg.text}`
    );

    // Logic
    if (!ctx.msg.text) {
      await sendMarkdownMessage(ctx, `*Please provide a name to search for*`);
      return;
    }

    let formattedName = ctx.msg.text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    async function search() {
      const statusMessage = await ctx.reply(
        `*Searching for ${formattedName}*`,
        {
          parse_mode: "Markdown",
        }
      );

      try {
        const searchResults = await searchWikifeet(formattedName);
        console.log(`${searchResults.length} pics found for ${formattedName}`);
        await sendMarkdownMessage(
          ctx,
          `*${searchResults.length} pics found for ${formattedName}*`
        );
        return searchResults;
      } catch (error) {
        console.error(error);
        await sendMarkdownMessage(
          ctx,
          `*Error while searching Wikifeet for ${formattedName}*`
        );
        throw error;
      } finally {
        await bot.api.deleteMessage(ctx.from.id, statusMessage.message_id);
      }
    }

    async function searchWikifeet(name) {
      try {
        const searchResults = await wikifeet.search(name);
        return searchResults;
      } catch (error) {
        console.error(error);
        throw error;
      }
    }

    async function sendMarkdownMessage(ctx, message) {
      await ctx.reply(message, {
        parse_mode: "Markdown",
      });
    }

    const results = await search();

    if (results.length === 0) {
      console.log(`No results found for ${formattedName}`);
      await sendMarkdownMessage(ctx, `*No results found for ${formattedName}*`);
      return;
    } else if (results.length <= 3) {
      console.error(`Not enough pics for ${formattedName}`);
      await sendMarkdownMessage(ctx, `*Not enough pics for ${formattedName}*`);
      return;
    } else {
      let query = results[0];
      let pics = await wikifeet.getImages(query);
      let randomIndices = Array.from(
        { length: 3 },
        () => 0 | (pics.length * Math.random())
      );
      try {
        let promises = randomIndices.map((index) =>
          ctx.replyWithPhoto(pics[index])
        );
        await Promise.all(promises);
        console.log("Pics sent");
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof GrammyError) {
      console.log(`Error sending message${error.message}`);
      return;
    } else {
      console.log("An error occurred");
      await ctx.reply(`*An error occurred*`, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.msg.message_id,
      });
      return;
    }
  }
});

// Error

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    "Error while handling update",
    ctx.update.update_id,
    "\nQuery:",
    ctx.msg.text
  );
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
    if (e.description === "Forbidden: bot was blocked by the user") {
      console.log("Bot was blocked by the user");
    } else {
      ctx.reply("An error occurred");
    }
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// Run

export default webhookCallback(bot, "http");
