import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.get("http://localhost:5237/api/workers")
        print("Status:", res.status_code)
        data = res.json()
        print("Total workers returned by GET /api/workers:", len(data))
        if data:
            print("First worker skills:", data[0].get("skills"))

if __name__ == "__main__":
    asyncio.run(test())
