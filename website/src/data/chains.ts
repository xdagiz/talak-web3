import ethereumLogo from "@/assets/logos/ethereum.png";
import optimismLogo from "@/assets/logos/optimism.png";
import bnbLogo from "@/assets/logos/bnb.png";
import polygonLogo from "@/assets/logos/polygon.png";
import baseLogo from "@/assets/logos/base.png";
import arbitrumLogo from "@/assets/logos/arbitrum.png";
import avalancheLogo from "@/assets/logos/avalanche.png";
import fantomLogo from "@/assets/logos/fantom.png";
import gnosisLogo from "@/assets/logos/gnosis.png";
import zksyncLogo from "@/assets/logos/zksync.png";
import lineaLogo from "@/assets/logos/linea.png";
import scrollLogo from "@/assets/logos/scroll.png";

export type Chain = {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  rpc: string;
  explorer: string;
  /** Hex chainId used by EIP-3326 wallet_switchEthereumChain. */
  hex: string;
  /** Subdued accent hex used in chips/tiles — kept neutral on purpose. */
  accent: string;
  /** Blockchain logo URL */
  logo: string;
  testnet?: boolean;
};

export const CHAINS: Chain[] = [
  { 
    id: 1,        
    name: "Ethereum",         
    shortName: "ETH",   
    symbol: "ETH",   
    rpc: "https://ethereum.publicnode.com",          
    explorer: "https://etherscan.io",        
    hex: "0x1",     
    accent: "#8a93a6",
    logo: ethereumLogo
  },
  { 
    id: 10,       
    name: "Optimism",         
    shortName: "OP",    
    symbol: "ETH",   
    rpc: "https://rpc.ankr.com/optimism",       
    explorer: "https://optimistic.etherscan.io", 
    hex: "0xa",  
    accent: "#9d8585",
    logo: optimismLogo
  },
  { 
    id: 56,       
    name: "BNB Smart Chain",  
    shortName: "BNB",   
    symbol: "BNB",   
    rpc: "https://bsc-dataseed1.binance.org",  
    explorer: "https://bscscan.com",         
    hex: "0x38",    
    accent: "#a39474",
    logo: bnbLogo
  },
  { 
    id: 137,      
    name: "Polygon",          
    shortName: "MATIC", 
    symbol: "MATIC", 
    rpc: "https://polygon-rpc.com",           
    explorer: "https://polygonscan.com",     
    hex: "0x89",    
    accent: "#9286a8",
    logo: polygonLogo
  },
  { 
    id: 8453,     
    name: "Base",             
    shortName: "BASE",  
    symbol: "ETH",   
    rpc: "https://mainnet.base.org",          
    explorer: "https://basescan.org",        
    hex: "0x2105",  
    accent: "#7b8aa4",
    logo: baseLogo
  },
  { 
    id: 42161,    
    name: "Arbitrum One",     
    shortName: "ARB",   
    symbol: "ETH",   
    rpc: "https://arb1.arbitrum.io/rpc",      
    explorer: "https://arbiscan.io",         
    hex: "0xa4b1", 
    accent: "#7b96a4",
    logo: arbitrumLogo
  },
  { 
    id: 43114,    
    name: "Avalanche C-Chain",
    shortName: "AVAX",  
    symbol: "AVAX",  
    rpc: "https://api.avax.network/ext/bc/C/rpc", 
    explorer: "https://snowtrace.io",   
    hex: "0xa86a",  
    accent: "#a4807b",
    logo: avalancheLogo
  },
  { 
    id: 250,      
    name: "Fantom Opera",     
    shortName: "FTM",   
    symbol: "FTM",   
    rpc: "https://rpc.ftm.tools",             
    explorer: "https://ftmscan.com",         
    hex: "0xfa",    
    accent: "#7b8da4",
    logo: fantomLogo
  },
  { 
    id: 100,      
    name: "Gnosis",           
    shortName: "GNO",   
    symbol: "xDAI",  
    rpc: "https://rpc.gnosischain.com",       
    explorer: "https://gnosisscan.io",       
    hex: "0x64",    
    accent: "#7ba48f",
    logo: gnosisLogo
  },
  { 
    id: 324,      
    name: "zkSync Era",       
    shortName: "ZKS", 
    symbol: "ETH",   
    rpc: "https://mainnet.era.zksync.io",     
    explorer: "https://explorer.zksync.io",  
    hex: "0x144",   
    accent: "#888a93",
    logo: zksyncLogo
  },
  { 
    id: 59144,    
    name: "Linea",            
    shortName: "LINEA", 
    symbol: "ETH",   
    rpc: "https://rpc.linea.build",           
    explorer: "https://lineascan.build",     
    hex: "0xe708", 
    accent: "#838387",
    logo: lineaLogo
  },
  { 
    id: 534352,   
    name: "Scroll",           
    shortName: "SCRL",  
    symbol: "ETH",   
    rpc: "https://rpc.scroll.io",             
    explorer: "https://scrollscan.com",      
    hex: "0x82750", 
    accent: "#a09380",
    logo: scrollLogo
  },
  { 
    id: 11155111, 
    name: "Sepolia",          
    shortName: "SEP",   
    symbol: "ETH",   
    rpc: "https://rpc.sepolia.org",           
    explorer: "https://sepolia.etherscan.io",
    hex: "0xaa36a7",
    accent: "#7c8a98", 
    testnet: true,
    logo: ethereumLogo
  },
];

export function getChainById(id: number | string | null | undefined): Chain | undefined {
  if (id === null || id === undefined) return undefined;
  const numericId = typeof id === "string"
    ? (id.startsWith("0x") ? parseInt(id, 16) : parseInt(id, 10))
    : id;
  if (Number.isNaN(numericId)) return undefined;
  return CHAINS.find(c => c.id === numericId);
}
