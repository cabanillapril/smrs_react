# Manual LAN Deployment Guide for SMRS

Follow these step-by-step instructions to host SMRS on your local college network (LAN) manually.

---

### Step 1: Find the Host (Server) IP Address
On the computer that will act as the server:
1. Open **Command Prompt** (cmd) or **PowerShell**.
2. Run the following command:
   ```cmd
   ipconfig
   ```
3. Locate your active network adapter (usually "Wireless LAN adapter Wi-Fi" or "Ethernet adapter").
4. Note down the **IPv4 Address** (e.g., `192.168.1.105`). *This is the address other computers will use to connect.*
5. **Pro Tip:** Set this IP as "Static" in your Windows Network Settings to prevent it from changing later.

---

### Step 2: Configure the Frontend API URL (Crucial)
You must tell the frontend to talk to the server's IP address instead of `localhost`.

1. Navigate to the `frontend` folder.
2. Create or edit the file named **`.env.production`**. **(Note the dot at the beginning!)**
3. Add the following line (replace `192.168.1.105` with your actual IPv4 address from Step 1):
   ```env
   VITE_API_BASE=http://192.168.254.107:8000
   ```

---

### Step 3: Build the Frontend Production Package
Compile the React frontend into highly optimized static web files.

1. Open a terminal in the `frontend` folder.
2. Run the build command:
   ```bash
   npm install
   npm run build
   ```
3. This will create a folder named **`dist`** inside your `frontend` directory.

---

### Step 4: Run the Python Backend on the Network
Start your FastAPI backend and configure it to listen to connections from other computers.

1. Open a new terminal and navigate to the `backend` folder.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the backend server. Using your specific Wi-Fi IP (e.g. `192.168.254.107`) ensures it ignores other network ports:
   ```bash
   python -m uvicorn app.main:app --host 192.168.254.107 --port 8000
   ```
   *Keep this window open.*

---

### Step 5: Serve the Frontend static files
Use a lightweight web server to host the built frontend files.

1. Install the `serve` tool globally (if you haven't already):
   ```bash
   npm install -g serve
   ```
2. In your terminal, go to the `frontend` folder.
3. Serve the **`dist`** folder on your specific IP to ensure the correct network is used:
   ```bash
   serve -s dist -l 192.168.254.107:3000
   ```
   *Keep this window open.*

---

### Step 6: Set Network to Private (Essential for Mobile)
Windows hides your computer from other devices if your network is set to "Public".
1. Go to **Settings > Network & internet > Wi-Fi**.
2. Click on your Wi-Fi name.
3. Select **Private** under "Network profile type".

---

### Step 7: Configure Windows Firewall (Crucial)
By default, Windows blocks incoming connections to port `3000` and `8000`. You must allow them:

1. Open the Start menu, search for **Windows Defender Firewall with Advanced Security**, and open it.
2. Click **Inbound Rules** on the left menu.
3. Click **New Rule...** on the right sidebar.
4. Choose **Port** and click Next.
5. Choose **TCP** and in **Specific local ports**, enter: `3000, 8000`. Click Next.
6. Choose **Allow the connection** and click Next.
7. Leave all rules checked (Domain, Private, Public) and click Next.
8. Name the rule `SMRS LAN Ports` and click **Finish**.

---

### Accessing the Web App
Open any browser on any computer connected to the same Wi-Fi/Ethernet network and type:
```text
http://<YOUR_IP>:3000
```
*(For example: `http://192.168.1.105:3000`)*
