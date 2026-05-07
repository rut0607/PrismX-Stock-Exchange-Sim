# PrismX

**PrismX is a securities exchange infrastructure built from scratch.**

Not a trading app. Not a brokerage wrapper. No calls to any external exchange.  
PrismX owns the full trade lifecycle end to end.

Most developers have interacted with the surface of a stock exchange — placing orders through an app, watching prices move in real time. Almost none have seen what runs underneath. PrismX is that underneath: the matching engine that pairs buyers with sellers using strict price-time priority, the risk engine that validates collateral before any order enters the book, the settlement layer that atomically transfers cash and shares inside a single PostgreSQL transaction, and the decision intelligence engine that detects behavioral patterns in every trade a participant makes.

The system is modelled on how NSE and BSE operate internally — designed for the Indian equity market (`.NS` / `.BO` symbols), built with production-grade infrastructure, and extended with a behavioral analytics layer that real exchanges do not have.

PrismX owns the full stack:

- Order intake, validation, and routing via REST API
- Pre-trade risk checks with real-time collateral locking
- In-memory order book management via price-time priority matching (MaxHeap + MinHeap)
- Partial fill support with correct order lifecycle state transitions
- Atomic Delivery-versus-Payment (DvP) settlement via PostgreSQL stored functions
- Double-entry bookkeeping across cash and securities dimensions
- Real-time trade dissemination over WebSockets (Socket.io)
- Redis caching for market data with automatic fallback
- Circuit breakers that halt trading on abnormal price movement
- Decision intelligence layer detecting panic selling, overtrading, and trend bias
- Behavioral analytics with replay mode and strategy comparison

---

## Architecture

PrismX is a **modular monolith** — a single deployable backend with strict internal service boundaries. Each domain (matching, risk, settlement, ledger, market data, decision intelligence) is fully isolated behind its own service layer. No shared state between domains. The architecture is intentionally designed for future decomposition into independent microservices without major refactoring.

```
                    +------------------------------------------+
                    |           Market Participants            |
                    |     Traders · Algorithms · Investors     |
                    +--------------------+---------------------+
                                         |  REST API / WebSocket
                                +--------v---------+
                                |   API Gateway    |  :3000
                                |  Express + Auth  |
                                +--+------+-----+--+
                                   |      |     |
                    +--------------+      |     +--------------+
                    v                     v                    v
         +------------------+  +------------------+  +------------------+
         |   Risk Service   |  | Matching Engine  |  |  Market Service  |
         | Pre-trade checks |  | MaxHeap + MinHeap|  | Yahoo + Redis    |
         | Collateral lock  |  | Price-time FIFO  |  | 5-15s TTL cache  |
         +------------------+  +--------+---------+  +------------------+
                                        |
                              Trade Executed
                                        |
                    +-------------------+-------------------+
                    v                                       v
         +------------------+                   +------------------+
         | Settlement Layer |                   |   Market Data    |
         | Atomic DvP Tx    |                   |   Feed (WS)      |
         | 4-way DB commit  |                   | Socket.io rooms  |
         +--------+---------+                   +------------------+
                  |
         Trade Settled
                  |
         +--------v---------+
         |  Ledger Service  |
         | Double-entry     |
         | Cash + Securities|
         +--------+---------+
                  |
         +--------v---------+
         | Decision Engine  |
         | Behavioral AI    |
         | Pattern detection|
         +------------------+
```

---

**On the matching engine:**
> "We implemented an in-memory matching engine using a MaxHeap for buy orders and a MinHeap for sell orders, achieving O(1) best-price lookup and O(log n) insertion with strict price-time priority — the same algorithm used by NSE and BSE. A queue-based execution model ensures single-threaded processing, eliminating race conditions without locks."

**On settlement:**
> "All trade execution — order status updates, wallet debits and credits, portfolio updates, and trade recording — happens inside a single PostgreSQL stored function. This guarantees atomicity via Delivery versus Payment: either all four movements commit, or none do. The database never enters a partial state."

**On the decision intelligence layer:**
> "We built a rule-based behavioral analysis engine that evaluates every trade against historical price data to detect patterns like panic selling, early exits, and overtrading. This layer doesn't exist in standard exchange infrastructure — it's PrismX's proprietary extension on top of the core trading system."

**On Redis:**
> "We use Redis for two purposes: market price caching with a 5–15 second TTL to reduce Yahoo Finance API calls, and as the pub/sub backbone for real-time trade event dissemination to WebSocket clients."

**On scalability:**
> "The current architecture is a modular monolith designed for future decomposition. The matching engine is already isolated behind a service boundary. Scaling would mean partitioning order books by symbol across multiple engine instances, using Redis for order book state persistence across instances, and introducing a message broker like Kafka to decouple settlement from matching."

This is what PrismX does every time a participant places an order — from submission to final settlement and behavioral analysis.



                    +------------------------------------------+
                    |           Market Participants            |
                    |     Traders · Algorithms · Investors     |
                    +--------------------+---------------------+
                                         |  REST API / WebSocket
                                +--------v---------+
                                |   API Gateway    |  :3000
                                |  Express + Auth  |
                                +--+------+-----+--+
                                   |      |     |
                    +--------------+      |     +--------------+
                    v                     v                    v
         +------------------+  +------------------+  +------------------+
         |   Risk Service   |  | Matching Engine  |  |  Market Service  |
         | Pre-trade checks |  | MaxHeap + MinHeap|  | Yahoo + Redis    |
         | Collateral lock  |  | Price-time FIFO  |  | 5-15s TTL cache  |
         +------------------+  +--------+---------+  +------------------+
                                        |
                              Trade Executed
                                        |
                    +-------------------+-------------------+
                    v                                       v
         +------------------+                   +------------------+
         | Settlement Layer |                   |   Market Data    |
         | Atomic DvP Tx    |                   |   Feed (WS)      |
         | 4-way DB commit  |                   | Socket.io rooms  |
         +--------+---------+                   +------------------+
                  |
         Trade Settled
                  |
         +--------v---------+
         |  Ledger Service  |
         | Double-entry     |
         | Cash + Securities|
         +--------+---------+
                  |
         +--------v---------+
         | Decision Engine  |
         | Behavioral AI    |
         | Pattern detection|
         +------------------+
```


---


### API Gateway `:3000`

The public entry point for all participants. Every inbound request is authenticated and risk-checked before reaching the matching engine.

```
POST   /api/v1/auth/signup          Register new participant
POST   /api/v1/auth/login           Authenticate and receive JWT
GET    /api/v1/auth/me              Get participant profile + wallet

POST   /api/v1/orders               Submit a new order
GET    /api/v1/orders               List participant's orders
GET    /api/v1/orders/:id           Get single order
DELETE /api/v1/orders/:id           Cancel an open order

GET    /api/v1/portfolio            Wallet balance + holdings summary
GET    /api/v1/trades               Trade history (trade tape)

GET    /api/v1/market/:symbol       Live price for a symbol
GET    /api/v1/orderbook/:symbol    Order book depth (top 5 bids + asks)

GET    /api/v1/decisions            Behavioral feedback for participant
GET    /api/v1/analytics            Full behavioral analytics report
GET    /api/v1/replay               Trade timeline vs price movement

GET    /api/v1/health               System health check
```

**Submit an order:**
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer {your_jwt}" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","side":"BUY","type":"LIMIT","price":3500,"quantity":10}'
```

---

### Risk Engine (Internal Service)

The pre-trade gatekeeper. No order reaches the order book without passing the risk check. Runs synchronously — the API gateway blocks until a response is received.

- **BUY orders:** verify `wallet.balance >= price × quantity`, lock required cash immediately
- **SELL orders:** verify `portfolio.quantity >= order.quantity`
- Rejects with descriptive error if collateral is insufficient
- Locked funds are refunded on cancellation or if trade executes at a better price

---

### Matching Engine (In-Memory, `:internal`)

The heart of PrismX. Maintains a live order book per listed security entirely in memory and applies strict price-time priority matching against every incoming order.

- **MaxHeap** for BUY orders — highest bid surfaces first, O(1) peek
- **MinHeap** for SELL orders — lowest ask surfaces first, O(1) peek
- **Queue-based execution** — single-threaded processing eliminates race conditions
- Full fills, partial fills, and resting limit orders
- **Circuit breaker** — halts symbol on abnormal price movement
- On trade match, triggers atomic settlement via `execute_trade()`

**Order book depth:**
```bash
curl http://localhost:3000/api/v1/orderbook/TCS
```
```json
{
  "symbol": "TCS",
  "bids": [
    { "price": 3520, "quantity": 50 },
    { "price": 3515, "quantity": 100 }
  ],
  "asks": [
    { "price": 3500, "quantity": 30 },
    { "price": 3505, "quantity": 80 }
  ],
  "spread": 0
}
```

---

### Settlement Engine (PostgreSQL Stored Function)

Implements **Delivery versus Payment (DvP)** — cash and securities transfer simultaneously or not at all, inside a single atomic database transaction.

The `execute_trade()` PostgreSQL function performs atomically:

1. Update buy order — `filled_quantity`, `remaining_quantity`, `status`
2. Update sell order — same
3. Insert into `trades` table — permanent immutable record
4. **DEBIT** buyer wallet — `balance -= total_value`
5. **CREDIT** seller wallet — `balance += total_value`
6. **DEBIT** seller portfolio — `quantity -= trade_qty`
7. **CREDIT** buyer portfolio — `quantity += trade_qty`, recalculate weighted avg price
8. Refund buyer if trade price < order price (bid was higher than ask)

If any step fails, the entire transaction rolls back. The database never enters a partial state.

---

### Ledger Service (Internal)

The financial source of truth. Implements **double-entry bookkeeping** across cash and securities dimensions. Every financial movement produces two equal and opposite journal entries that sum to zero.

```
Trade: Buyer pays ₹35,000 for 10 TCS shares

cash_journal:
  DEBIT  buyer  cash    ₹35,000
  CREDIT seller cash    ₹35,000

securities_journal:
  DEBIT  seller TCS     10 shares
  CREDIT buyer  TCS     10 shares

Net: ₹0 cash movement · 0 share movement. Always.
```

---

### Market Data Service (Internal)

Fetches live NSE/BSE prices from Yahoo Finance's unofficial API with Redis caching and automatic fallback.

- Backend-only API access — never exposed to frontend
- Redis cache with 5–15 second TTL per symbol
- Automatic fallback to last cached price on API failure
- Completely decoupled from matching engine — engine operates on order prices, not live prices

**Architecture:**
```
Frontend → Backend → Yahoo Finance API
                  ↓
               Redis Cache (5-15s TTL)
                  ↓
            Fallback: last cached price
```

---

### Market Data Feed (WebSocket)

Real-time broadcast of all market activity over WebSockets via Socket.io.

**Connect:**
```javascript
const socket = io('http://localhost:3000');
```

**Subscribe to a symbol's trade feed:**
```javascript
socket.emit('subscribe', { channel: 'trades.TCS' });
socket.on('trade', (data) => console.log(data));
```

**Channels:**

| Channel | Description |
|---|---|
| `trades.{symbol}` | Live trade feed — price, quantity, timestamp |
| `ticker.{symbol}` | Last traded price, volume |
| `orderbook.{symbol}` | Order book depth updates |
| `portfolio.{userId}` | Real-time portfolio updates |

---

### Decision Intelligence Engine

PrismX's proprietary layer — not present in any standard exchange infrastructure. A rule-based behavioral analysis system that evaluates every trade and detects patterns across a participant's trading history.

**Detections:**

| Pattern | Trigger | Feedback |
|---|---|---|
| Early Exit | Sold within X minutes, price rose >3% after | "You sold early. Holding longer could have yielded higher returns." |
| Panic Selling | Sold during rapid price decline, price recovered | "This looks like panic selling. The price recovered within the hour." |
| Overtrading | >N trades in 24h on same symbol | "You've traded TCS 8 times today. Frequent trading increases cost basis." |
| Trend Bias | Consistently buys near highs, sells near lows | "You tend to buy at price peaks. Consider a systematic entry strategy." |
| Averaging Down | Bought on the way down | "You added to a losing position 3 times. Deliberate or reactive?" |

**Replay Mode:** Full timeline visualization of participant's trades plotted against price movement — shows exactly where they entered and exited relative to price action.

**Strategy Comparison:** Compares participant's actual P&L against a simple buy-and-hold strategy for the same symbols over the same period.

---

## Main Funtionalities 

### Price-Time Priority

The universal matching rule of all order-driven exchanges. Orders are matched by best price first lowest ask for buyers, highest bid for sellers. When two orders share the same price, the one submitted earliest is matched first . Every major exchange NASDAQ, NSE, BSE uses this rule. PrismX implements this with a **MaxHeap** for buy orders and a **MinHeap** for sell orders. Both heaps use a composite comparator: price is the primary key, `created_at` timestamp is the tiebreaker.

### Atomic Delivery versus Payment (DvP)

The settlement principle that cash and securities must transfer simultaneously. The atomic PostgreSQL stored function (`execute_trade`) enforces this four movements (buyer cash debit, seller cash credit, seller shares debit, buyer shares credit) commit together or all four roll back.

There is no state in which a buyer pays without receiving shares, or a seller delivers shares without receiving payment.

### Collateral Locking (Pre-Trade Risk)

Funds are locked at order placement, not at trade execution. When a BUY order is placed for 10 TCS @ ₹3500, ₹35,000 is immediately deducted from the buyer's wallet and held in reserve. This prevents double-spending across multiple simultaneous orders. On cancellation or a better execution price, the difference is refunded.

### Queue-Based Concurrency Control

The matching engine processes orders from a queue one at a time. A single `isProcessing` boolean guard ensures that even if thousands of orders arrive simultaneously, they are enqueued and processed sequentially. This eliminates race conditions without locks, mutexes, or distributed coordination — and guarantees **deterministic order matching**.

### Circuit Breakers

When the matching engine detects a security's price has moved beyond a configured threshold within a rolling time window, it halts trading for that symbol. This mirrors NSE's dynamic price band mechanism preventing flash crashes from cascading through the order book.


### Redis Caching Strategy

Market prices from Yahoo Finance are cached in Redis with a 5–15 second TTL depending on market hours. On cache miss, the backend fetches fresh data and repopulates the cache. On API failure, the system serves the last cached price rather than returning an error — ensuring the UI always has price data to display.

### Weighted Average Buy Price

When a participant buys shares across multiple trades at different prices, PrismX recalculates the weighted average cost basis after every fill:

```
new_avg = (current_qty × current_avg + new_qty × new_price) / (current_qty + new_qty)
```

This is the standard cost accounting method used by every brokerage and exchange in India.

---

## Database Schema

```sql
wallets
  id uuid PK
  user_id uuid FK → auth.users (UNIQUE)
  balance numeric(20,4)
  CHECK (balance >= 0)              ← DB-level negative balance prevention

portfolios
  id uuid PK
  user_id uuid FK → auth.users
  symbol varchar(20)
  quantity numeric(20,4)
  average_buy_price numeric(20,4)
  UNIQUE (user_id, symbol)
  CHECK (quantity >= 0)             ← DB-level overselling prevention

orders
  id uuid PK
  user_id uuid FK → auth.users
  symbol varchar(20)
  side order_side (BUY | SELL)
  type order_type (LIMIT | MARKET)
  status order_status (OPEN | PARTIAL | COMPLETED | CANCELLED)
  price numeric(20,4)
  quantity numeric(20,4)
  filled_quantity numeric(20,4)
  remaining_quantity numeric(20,4)
  CHECK (filled_quantity <= quantity)
  CHECK (remaining_quantity >= 0)

trades
  id uuid PK
  symbol varchar(20)
  buy_order_id uuid FK → orders
  sell_order_id uuid FK → orders
  buyer_id uuid FK → auth.users
  seller_id uuid FK → auth.users
  price numeric(20,4)
  quantity numeric(20,4)
  total_value numeric(20,4)
  executed_at timestamptz

market_prices
  id uuid PK
  symbol varchar(20) UNIQUE
  price numeric(20,4)
  previous_close numeric(20,4)
  change_percent numeric(10,4)
  fetched_at timestamptz

ledger_entries                      ← Day 6
  id uuid PK
  user_id uuid FK → auth.users
  trade_id uuid FK → trades
  entry_type (DEBIT | CREDIT)
  dimension (CASH | SECURITIES)
  symbol varchar(20)
  amount numeric(20,4)
  created_at timestamptz
```

**Partial Indexes (matching engine performance):**
```sql
CREATE INDEX idx_orders_buy_matching
  ON orders (symbol, price DESC, created_at ASC)
  WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIAL');

CREATE INDEX idx_orders_sell_matching
  ON orders (symbol, price ASC, created_at ASC)
  WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIAL');
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Language | Node.js + TypeScript | Type safety critical for financial data |
| HTTP Framework | Express.js | Lightweight, modular, production-proven |
| Authentication | Supabase Auth + JWT | Managed auth, no custom token boilerplate |
| Database | PostgreSQL (Supabase) | ACID transactions, stored functions, constraints |
| Order Book | In-memory MaxHeap + MinHeap | O(1) best-price lookup, no DB round-trips during matching |
| Caching | Redis | Market price TTL cache + pub/sub for trade events |
| Real-time | Socket.io | WebSocket rooms per symbol for live trade feed |
| Logging | Winston + Morgan | Structured JSON logs for prod, colored for dev |
| Metrics | Prometheus client | HTTP + engine metrics endpoint |
| Load Testing | k6 | Matching engine throughput benchmarking |
| Containerization | Docker + docker-compose | Full local deployment in one command |
| Frontend | React + Vite + Tailwind CSS v4 | Fast builds, modern CSS, TypeScript |
| Charts | Recharts | Portfolio charts, replay mode visualization |

---

## System Failure Points & Solutions

| Failure | Problem | PrismX Solution |
|---|---|---|
| Matching engine bottleneck | DB-based matching → too slow | In-memory heaps, DB only written on execution |
| Race conditions | Concurrent order mismatches | Queue-based single-threaded engine processing |
| Data inconsistency | Partial trade updates | Atomic PostgreSQL stored function |
| Negative balance | Invalid buy orders | Service validation + DB CHECK constraint |
| Overselling | Selling shares you don't own | Portfolio check + DB CHECK constraint |
| External API failure | Yahoo Finance downtime | Redis cache + last-known-price fallback |
| Engine state loss on restart | In-memory book wiped | Redis persistence + DB seed on startup |
| Duplicate trade execution | Same order matched twice | UUID idempotency keys + DB unique constraints |
| Flash crash | Price moves 10%+ rapidly | Circuit breaker halts symbol trading |
| No audit trail | Hard to debug financial issues | Double-entry ledger + Winston structured logs |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone the repository
```bash
git clone https://github.com/your-username/prismx.git
cd prismx
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Fill in `.env`:
```bash
PORT=3000
NODE_ENV=development

# Supabase → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-signing-secret
SUPABASE_ANON_KEY=your-anon-key

# Redis
REDIS_URL=redis://localhost:6379
```

### 4. Start infrastructure
```bash
docker compose up -d        # starts Redis
docker compose ps           # all containers should show healthy
```

### 5. Run database migrations
Go to **Supabase → SQL Editor** and run `db/migrations/001_schema.sql`

### 6. Start the server
```bash
npm run dev
```

### 7. Register participants and trade

**Register:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"password123"}'
```

**Place a limit buy order:**
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer {your_jwt}" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","side":"BUY","type":"LIMIT","price":3500,"quantity":10}'
```

**Subscribe to live trades:**
```javascript
const socket = io('http://localhost:3000');
socket.emit('subscribe', { channel: 'trades.TCS' });
socket.on('trade', (trade) => console.log(trade));
```

**Check portfolio:**
```bash
curl http://localhost:3000/api/v1/portfolio \
  -H "Authorization: Bearer {your_jwt}"
```

---

## Development Roadmap

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Backend foundation, folder structure, Supabase schema, Auth | ✅ Complete |
| Phase 2 | Matching engine — MaxHeap, MinHeap, price-time priority, partial fills | ✅ Complete |
| Phase 3 | Atomic settlement, execute_trade stored function, live trade test | ✅ Complete |
| Phase 4 | Market data service, Redis caching, Socket.io real-time feed | 🔄 In Progress |
| Phase 5 | Circuit breakers, double-entry ledger, order book depth API | Planned |
| Phase 6 | Docker + docker-compose full deployment | Planned |
| Phase 7 | Prometheus metrics, structured observability | Planned |
| Phase 8 | Frontend — React dashboard, trading UI, real-time charts | Planned |
| Phase 9 | Decision intelligence layer — behavioral analytics, replay mode | Planned |
| Phase 10 | k6 load testing, benchmarking, final polish | Planned |

---

## Project Structure

```
prismx/
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
│
├── src/
│   ├── config/
│   │   ├── env.ts              Environment validation — fails fast on missing vars
│   │   └── supabase.ts         Singleton Supabase client (service role)
│   │
│   ├── engine/
│   │   ├── heap.ts             MinHeap + MaxHeap with price-time priority comparators
│   │   ├── orderBook.ts        Per-symbol order book (bids + asks)
│   │   └── matchingEngine.ts   Queue-based engine singleton — processes one order at a time
│   │
│   ├── services/
│   │   ├── auth.service.ts     Signup, login, profile
│   │   ├── order.service.ts    Place, list, cancel — risk checks + engine submission
│   │   ├── trade.service.ts    Trade history, trade tape
│   │   ├── portfolio.service.ts Wallet + holdings summary
│   │   ├── market.service.ts   Yahoo Finance + Redis cache + fallback
│   │   ├── ledger.service.ts   Double-entry journal writes
│   │   └── decision.service.ts Behavioral pattern detection
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── order.controller.ts
│   │   ├── trade.controller.ts
│   │   ├── portfolio.controller.ts
│   │   ├── market.controller.ts
│   │   └── decision.controller.ts
│   │
│   ├── routes/
│   │   ├── index.ts            Central route registry
│   │   ├── auth.routes.ts
│   │   ├── order.routes.ts
│   │   ├── trade.routes.ts
│   │   ├── portfolio.routes.ts
│   │   ├── market.routes.ts
│   │   ├── decision.routes.ts
│   │   └── health.routes.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts   JWT verification via Supabase
│   │   └── error.middleware.ts  Global error handler + asyncHandler wrapper
│   │
│   ├── types/
│   │   └── index.ts            Shared TypeScript interfaces
│   │
│   ├── utils/
│   │   ├── logger.ts           Winston — JSON for prod, colored for dev
│   │   └── response.ts         Standardized API response helpers
│   │
│   ├── app.ts                  Express app factory (separated for testability)
│   └── server.ts               Entry point — bootstrap + graceful shutdown
│
└── db/
    └── migrations/
        ├── 001_schema.sql       Core tables + constraints + indexes + triggers
        └── 002_ledger.sql       Double-entry ledger tables
```

---

## NSE/BSE Market Scope

PrismX simulates trading on Indian exchanges. Symbols follow Yahoo Finance conventions:

| Exchange | Suffix | Example |
|---|---|---|
| NSE | `.NS` | `TCS.NS`, `RELIANCE.NS`, `INFY.NS` |
| BSE | `.BO` | `TCS.BO`, `RELIANCE.BO` |

All monetary values are in **Indian Rupees (₹)**. Starting wallet balance per participant: **₹10,00,000**.

---

## What are the Prometheus metrics? I am using it for Observability  

Prometheus metrics are quantifiable data points most commonly used to monitor cloud infrastructure, and they'll signal when and where problems have taken or are taking place. Infrastructure monitoring metrics provide organizations insight into what's happening in a given environment.

---

*PrismX — Exchange infrastructure, built from scratch.*