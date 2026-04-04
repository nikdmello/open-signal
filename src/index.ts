import { appendFile, mkdir } from "node:fs/promises";

type Trade = {
  exchange: "coinbase";
  productId: string;
  tradeId: string;
  price: number;
  size: number;
  side: "BUY" | "SELL";
  eventTime: string;
  receivedAt: string;
};

function normalizeTrade(rawTrade: {
    product_id: string;
    trade_id: string;
    price: string;
    size: string;
    time: string;
    side: "BUY" | "SELL";
}): Trade {
    return {
        exchange: "coinbase",
        productId: rawTrade.product_id,
        tradeId: rawTrade.trade_id,
        price: Number(rawTrade.price),
        size: Number(rawTrade.size),
        side: rawTrade.side,
        eventTime: rawTrade.time,
        receivedAt: new Date().toISOString()
    };
}

async function persistTrade(trade: Trade): Promise<void> {
    await mkdir("data", { recursive: true });
    await appendFile("data/trades.ndjson", JSON.stringify(trade) + "\n" );
}

const WS_URL = "wss://advanced-trade-ws.coinbase.com";
const PRODUCT_ID = "BTC-USD";

console.log("OpenSignal starting...");

const socket = new WebSocket(WS_URL);

socket.addEventListener("open", () => {
    console.log("Connected to Coinbase");

    socket.send(
        JSON.stringify({
            type: "subscribe",
            channel: "market_trades",
            product_ids: [PRODUCT_ID]
        })
    );
});

socket.addEventListener("message", async (event) => {
    if (typeof event.data !== "string") {
        console.log("Received non-string message");
        return;
    }

    const message = JSON.parse(event.data);

    if (!message.events) {
        return;
    }

    for (const eventItem of message.events) {
        if (!eventItem.trades) {
            continue;
        }

        for (const trade of eventItem.trades) {
            const normalizedTrade = normalizeTrade(trade);
            console.log("Normalized trade:", normalizedTrade);
            await persistTrade(normalizedTrade);
        }
    }
});

socket.addEventListener("close", (event) => {
    console.log("Socket error:", event);
});