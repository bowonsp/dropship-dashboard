// REAL MARKETPLACE SCRAPER
// Scrape trending products dari Tokopedia & Shopee

const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuration
const CONFIG = {
  tokopedia: {
    trending_url: 'https://www.tokopedia.com/trending',
    search_url: 'https://www.tokopedia.com/search?q=',
  },
  shopee: {
    trending_url: 'https://shopee.co.id/search?page=0&sortBy=sales',
    search_url: 'https://shopee.co.id/search?keyword=',
  },
  headless: false, // Set true untuk production
  timeout: 30000,
};

// Scrape Tokopedia Trending
async function scrapeTokopediaTrending() {
  console.log('🔍 Scraping Tokopedia trending...');
  
  const browser = await puppeteer.launch({ 
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    await page.goto('https://www.tokopedia.com/', { 
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout 
    });
    
    // Wait for product cards
    await page.waitForSelector('[data-testid="divProductWrapper"]', { timeout: 10000 });
    
    // Extract trending products
    const products = await page.evaluate(() => {
      const items = [];
      const productCards = document.querySelectorAll('[data-testid="divProductWrapper"]');
      
      productCards.forEach((card, index) => {
        if (index >= 20) return; // Limit to top 20
        
        try {
          const nameEl = card.querySelector('[data-testid="linkProductName"]');
          const priceEl = card.querySelector('[data-testid="linkProductPrice"]');
          const imageEl = card.querySelector('img');
          const ratingEl = card.querySelector('[data-testid="icnRating"]');
          const soldEl = card.querySelector('[data-testid="lblProductSold"]');
          const shopEl = card.querySelector('[data-testid="linkShopName"]');
          
          if (nameEl && priceEl) {
            items.push({
              name: nameEl.textContent.trim(),
              price: priceEl.textContent.trim().replace(/[^0-9]/g, ''),
              image: imageEl ? imageEl.src : null,
              rating: ratingEl ? parseFloat(ratingEl.parentElement.textContent) : 0,
              sold: soldEl ? soldEl.textContent.trim() : '0',
              shop: shopEl ? shopEl.textContent.trim() : 'Unknown',
              marketplace: 'tokopedia',
              url: nameEl.href
            });
          }
        } catch (e) {
          console.log('Error parsing product:', e.message);
        }
      });
      
      return items;
    });
    
    console.log(`✅ Found ${products.length} products from Tokopedia`);
    await browser.close();
    return products;
    
  } catch (error) {
    console.error('❌ Error scraping Tokopedia:', error.message);
    await browser.close();
    return [];
  }
}

// Scrape Shopee Trending
async function scrapeShopeeTrending() {
  console.log('🔍 Scraping Shopee trending...');
  
  const browser = await puppeteer.launch({ 
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    await page.goto('https://shopee.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout 
    });
    
    // Wait for product cards
    await page.waitForSelector('[data-sqe="item"]', { timeout: 10000 });
    
    // Extract trending products
    const products = await page.evaluate(() => {
      const items = [];
      const productCards = document.querySelectorAll('[data-sqe="item"]');
      
      productCards.forEach((card, index) => {
        if (index >= 20) return;
        
        try {
          const nameEl = card.querySelector('[data-sqe="name"]');
          const priceEl = card.querySelector('[data-sqe="price"]');
          const imageEl = card.querySelector('img');
          const soldEl = card.querySelector('.shopee-search-item-result__sold-count');
          
          if (nameEl && priceEl) {
            const priceText = priceEl.textContent.trim();
            const priceClean = priceText.replace(/[^0-9]/g, '');
            
            items.push({
              name: nameEl.textContent.trim(),
              price: priceClean,
              image: imageEl ? imageEl.src : null,
              rating: 0, // Shopee rating sulit di-scrape
              sold: soldEl ? soldEl.textContent.trim() : '0',
              shop: 'Shopee Seller',
              marketplace: 'shopee',
              url: card.querySelector('a') ? card.querySelector('a').href : null
            });
          }
        } catch (e) {
          console.log('Error parsing product:', e.message);
        }
      });
      
      return items;
    });
    
    console.log(`✅ Found ${products.length} products from Shopee`);
    await browser.close();
    return products;
    
  } catch (error) {
    console.error('❌ Error scraping Shopee:', error.message);
    await browser.close();
    return [];
  }
}

// Analyze & categorize products
function analyzeProducts(products) {
  console.log('📊 Analyzing products...');
  
  const categories = {};
  
  products.forEach(product => {
    // Simple categorization based on keywords
    let category = 'Lainnya';
    
    const name = product.name.toLowerCase();
    
    if (name.includes('hijab') || name.includes('gamis') || name.includes('muslim')) {
      category = 'Fashion Muslim';
    } else if (name.includes('gadget') || name.includes('hp') || name.includes('charger') || name.includes('kabel')) {
      category = 'Gadget Accessories';
    } else if (name.includes('skincare') || name.includes('serum') || name.includes('cream')) {
      category = 'Skincare';
    } else if (name.includes('kitchen') || name.includes('dapur') || name.includes('panci')) {
      category = 'Alat Dapur';
    } else if (name.includes('mainan') || name.includes('toy') || name.includes('anak')) {
      category = 'Mainan Anak';
    } else if (name.includes('olahraga') || name.includes('sport') || name.includes('fitness')) {
      category = 'Olahraga';
    } else if (name.includes('tanaman') || name.includes('plant') || name.includes('pot')) {
      category = 'Tanaman Hias';
    } else if (name.includes('bayi') || name.includes('baby')) {
      category = 'Perlengkapan Bayi';
    } else if (name.includes('fashion') || name.includes('baju') || name.includes('celana')) {
      category = 'Fashion';
    } else if (name.includes('sepatu') || name.includes('shoes') || name.includes('sandal')) {
      category = 'Sepatu';
    }
    
    if (!categories[category]) {
      categories[category] = {
        name: category,
        products: [],
        totalSold: 0,
        avgPrice: 0,
        count: 0
      };
    }
    
    categories[category].products.push(product);
    categories[category].totalSold += parseInt(product.sold.replace(/[^0-9]/g, '')) || 0;
    categories[category].count++;
  });
  
  // Calculate averages & growth
  const results = Object.values(categories).map(cat => {
    const totalPrice = cat.products.reduce((sum, p) => sum + parseInt(p.price), 0);
    const avgPrice = Math.round(totalPrice / cat.count);
    const growth = Math.floor(70 + Math.random() * 80); // Simulated growth (need historical data)
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: cat.name,
      growth: growth,
      volume: cat.totalSold,
      competition: cat.count > 15 ? 'high' : cat.count > 8 ? 'medium' : 'low',
      avgPrice: avgPrice,
      productCount: cat.count,
      topProducts: cat.products.slice(0, 5)
    };
  });
  
  // Sort by volume
  results.sort((a, b) => b.volume - a.volume);
  
  return results;
}

// Main execution
async function main() {
  console.log('🚀 Starting Real Marketplace Scraper...\n');
  
  try {
    // Scrape both marketplaces
    const tokopediaProducts = await scrapeTokopediaTrending();
    console.log('');
    
    const shopeeProducts = await scrapeShopeeTrending();
    console.log('');
    
    // Combine results
    const allProducts = [...tokopediaProducts, ...shopeeProducts];
    console.log(`📦 Total products scraped: ${allProducts.length}\n`);
    
    // Analyze & categorize
    const categories = analyzeProducts(allProducts);
    console.log(`📊 Categories found: ${categories.length}\n`);
    
    // Save to JSON
    const output = {
      scrapedAt: new Date().toISOString(),
      totalProducts: allProducts.length,
      categories: categories,
      rawProducts: allProducts
    };
    
    fs.writeFileSync('marketplace-data.json', JSON.stringify(output, null, 2));
    console.log('✅ Data saved to marketplace-data.json\n');
    
    // Display summary
    console.log('📈 Top Categories by Volume:');
    categories.slice(0, 10).forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} - ${cat.productCount} products - ${cat.volume.toLocaleString()} sold - ${cat.competition} competition`);
    });
    
    console.log('\n✅ Scraping completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run scraper
if (require.main === module) {
  main();
}

module.exports = { 
  scrapeTokopediaTrending, 
  scrapeShopeeTrending, 
  analyzeProducts 
};
