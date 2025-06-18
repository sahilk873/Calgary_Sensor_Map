from fastapi import FastAPI, HTTPException
from bs4 import BeautifulSoup
import requests
from typing import List, Dict
import re
from pydantic import BaseModel
import asyncio
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from googlesearch import search
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchQuery(BaseModel):
    query: str

class InsightResponse(BaseModel):
    title: str
    content: str
    source_url: str
    timestamp: str

KEYWORDS = [
    "digital trust", "transparency", "sensor", "technology", "data", "privacy", "smart city", "IoT", "innovation", "open data", "AI", "machine learning", "cybersecurity", "public engagement", "digital infrastructure", "urban tech", "city technology", "digital services", "digital transformation", "digital government", "civic tech", "blockchain", "open government", "digital identity", "data sharing", "data governance", "public trust", "digital policy", "digital inclusion", "digital literacy", "digital rights", "digital ethics", "algorithm", "automated", "surveillance", "analytics", "cloud", "edge computing", "5G", "connectivity", "smart infrastructure", "urban sensors", "public wifi", "digital engagement", "digital participation", "digital feedback", "digital dashboard", "digital reporting", "digital monitoring", "digital twin"
]

def extract_text(tag):
    if tag:
        return tag.get_text(strip=True)
    return ''

def get_search_urls(query: str, num_results: int = 9) -> List[str]:
    try:
        # Add "calgary" to the search query to ensure local relevance
        search_query = f"{query} calgary"
        logger.info(f"Searching Google for: {search_query}")
        
        # Get URLs from Google search
        urls = list(search(search_query, num_results=num_results, stop=num_results))
        logger.info(f"Found {len(urls)} URLs from Google search")
        return urls
    except Exception as e:
        logger.error(f"Error in Google search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error performing Google search: {str(e)}")

async def scrape_url(url: str) -> Dict:
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        logger.info(f"Scraping URL: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try to find title and content
        title = None
        content = None
        
        # Try different title selectors
        for selector in ['h1', 'h2', 'h3', 'title']:
            title_tag = soup.find(selector)
            if title_tag:
                title = extract_text(title_tag)
                break
        
        # Try to find main content
        content_tag = soup.find('p')
        if content_tag:
            content = extract_text(content_tag)
        
        # If no content found, try to get first paragraph
        if not content:
            content = extract_text(soup.find('p'))
        
        # If still no content, get first 200 chars of body
        if not content:
            content = extract_text(soup.find('body'))[:200]
        
        result = {
            'title': title or 'Calgary Update',
            'content': content or 'No content available',
            'source_url': url,
            'timestamp': datetime.now().isoformat()
        }
        logger.info(f"Successfully scraped URL: {url}")
        return result
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return None

async def scrape_calgary_news(query: str) -> List[Dict]:
    logger.info(f"Starting search for query: {query}")
    
    # Get URLs from Google search
    urls = get_search_urls(query)
    logger.info(f"Found {len(urls)} URLs to scrape")
    
    if not urls:
        logger.warning("No URLs found")
        return []
    
    # Scrape each URL
    news_items = []
    for url in urls:
        item = await scrape_url(url)
        if item:
            news_items.append(item)
    
    logger.info(f"Scraped {len(news_items)} items")
    
    # Filter and prioritize items by keywords
    def matches_keywords(item):
        text = f"{item['title']} {item['content']}".lower()
        return any(keyword in text for keyword in KEYWORDS)
    
    # First, all items that match keywords, then the rest
    prioritized = [item for item in news_items if matches_keywords(item)]
    others = [item for item in news_items if not matches_keywords(item)]
    
    logger.info(f"Found {len(prioritized)} prioritized items and {len(others)} other items")
    
    # Return all results, with keyword matches first
    return prioritized + others

@app.post("/insights", response_model=List[InsightResponse])
async def get_calgary_insights(query: SearchQuery):
    try:
        logger.info(f"Received query: {query.query}")
        insights = await scrape_calgary_news(query.query)
        if not insights:
            logger.warning("No insights found")
            raise HTTPException(status_code=404, detail="No insights found")
        logger.info(f"Returning {len(insights)} insights")
        return insights
    except HTTPException as he:
        logger.error(f"HTTP Exception in get_calgary_insights: {str(he)}")
        raise
    except Exception as e:
        logger.error(f"Error in get_calgary_insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 