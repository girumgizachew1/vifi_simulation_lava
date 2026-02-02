
import urllib.request
import time
import json
import csv
import io
import os
from datetime import datetime, timedelta

# Configuration
CURRENCIES = {
    'NGN': 'NGN=X',
    'KES': 'KES=X',
    'ETB': 'ETB=X' # Yahoo usually uses this format
}

# 5 Years ago
end_date = int(time.time())
start_date = int((datetime.now() - timedelta(days=365*5)).timestamp())

OUTPUT_DIR = "../public/data"

def fetch_yahoo_data(symbol):
    url = f"https://query1.finance.yahoo.com/v7/finance/download/{symbol}?period1={start_date}&period2={end_date}&interval=1d&events=history&includeAdjustedClose=true"
    print(f"Downloading {symbol} from {url}...")
    
    try:
        # Yahoo requires a User-Agent often
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

def csv_to_json(csv_text):
    data = []
    reader = csv.DictReader(io.StringIO(csv_text))
    for row in reader:
        try:
            # Date,Open,High,Low,Close,Adj Close,Volume
            # We use 'Close' or 'Adj Close'
            price = row.get('Adj Close') or row.get('Close')
            if price and price != 'null':
                data.append({
                    'date': row['Date'],
                    'price': float(price)
                })
        except ValueError:
            continue
    return data

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for name, symbol in CURRENCIES.items():
        print(f"Processing {name} ({symbol})...")
        csv_text = fetch_yahoo_data(symbol)
        
        if csv_text:
            json_data = csv_to_json(csv_text)
            
            # Check for empty data (Yahoo sometimes returns valid CSV with no rows if symbol is wrong)
            if not json_data:
                print(f"Warning: No data found for {name}. Trying alternative symbol USD{name}=X...")
                # Fallback trial
                csv_text = fetch_yahoo_data(f"USD{name}=X")
                if csv_text:
                     json_data = csv_to_json(csv_text)

            if json_data:
                out_path = os.path.join(OUTPUT_DIR, f"{name}.json")
                with open(out_path, 'w') as f:
                    json.dump(json_data, f, indent=2)
                print(f"Saved {len(json_data)} records to {out_path}")
            else:
                print(f"Failed to get data for {name}")
        else:
            print(f"Download failed for {name}")

if __name__ == "__main__":
    main()
