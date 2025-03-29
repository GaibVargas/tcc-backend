# Dependencies

- Node.js v22 or superior
- npm v10 or superior

# Running the project

### Development

```bash
npm install
```

By default the backend of the project is available at http://localhost:3333

### Production

```bash
npx migrate deploy
npm install --production
npx prisma generate
npm run build
npm run start
```

### Database changes in development

When the database structure is changed, it's necessary to run:
```bash
npx prisma migrate dev
npx prisma generate
```

Those commands will keep the prisma in sync.
