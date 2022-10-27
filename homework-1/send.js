#!/usr/bin/env node

const amqplib = require("amqplib");

function sleep(ms) {
  return new Promise((resolve, _) => {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}

async function main() {
  try {
    const connection = await amqplib.connect("amqp://localhost");
    const channel = await connection.createChannel();

    const exchange = "ex-dir";
    const msg = "ciao";
    const routingKey = "test";

    channel.assertExchange(exchange, "direct", {
      durable: false,
    });

    for (let i = 0; i < 100; i++) {
      const formatMsg = `${msg}_${i}`;
      const res = channel.publish(exchange, routingKey, Buffer.from(formatMsg));
      console.log(res);
      await sleep(1000);
    }

    connection.close();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
