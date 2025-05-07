# Rightmove Scraper API Documentation

## Overview
This document describes the API for the Rightmove Property Scraper Actor. The actor scrapes property listings from Rightmove and provides structured data with detailed property information.

## Input Schema

```json
{
    "startUrls": [
        { "url": "https://www.rightmove.co.uk/properties/12345" }
    ],
    "maxItems": 100,
    "webhooks": [
        {
            "url": "https://your-webhook.com/endpoint",
            "eventTypes": ["ITEM_SCRAPED", "ITEM_FAILED", "RUN_FINISHED"]
        }
    ]
}