# Gator – RSS Feed Aggregator CLI

Gator is a multi-user CLI RSS feed aggregator built with:

- TypeScript
- PostgreSQL
- Drizzle ORM

It allows users to:

- Register and login
- Add RSS feeds
- Follow and unfollow feeds
- Continuously scrape feeds in the background
- Store posts in a database
- Browse posts directly from the terminal

---

# 🚀 Requirements

Before running Gator, you must have:

- Node.js v22.15.0 (recommended via NVM)
- PostgreSQL 16+
- psql installed and working
- A running Postgres server on localhost:5432

---

# 📦 Installation

Clone the repository:

```bash
git clone https://github.com/asmaahassoneh/gator 
cd gator
```

## 2️⃣ Install Dependencies

```bash
npm install
```

# 🗄️ Database Setup
## 1️⃣ Create database
```bash
psql postgres
```

```psql:
CREATE DATABASE gator;
\q
```

## 2️⃣ Set postgres password (Linux)
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

#⚙️ Config File Setup

Create this file:
~/.gatorconfig.json

Example (Linux):

{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}

Example (macOS):

{
  "db_url": "postgres://yourusername:@localhost:5432/gator?sslmode=disable"
}

#🧱 Run Migrations
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```
This creates all required tables:
users
feeds
feed_follows
posts

🏃 Running the CLI
npm run start <command>

Example:
```bash
npm run start register lane
```

#📚 Available Commands
👤 User Commands
```bash
npm run start register <username>
```

```bash
npm run start login <username>
```
```bash
npm run start users
```

#📡 Feed Commands
Add Feed

```bash
npm run start addfeed "Feed Name" "<feed_url>"
```

Follow Feed
```bash
npm run start follow "<feed_url>"
```

Unfollow Feed
```bash
npm run start unfollow "<feed_url>"
```

List Feeds
```bash
npm run start feeds
```

See What You're Following
```bash
npm run start following
```

#📰 Aggregation
Run Aggregator (long running)
npm run start agg 1m


Supported duration formats:
500ms
10s
5m
1h

Stop with:
Ctrl + C


📖 Browse Posts

Show latest posts (default limit = 2):
npm run start browse

Specify limit:
npm run start browse 10

Posts are ordered newest first.

