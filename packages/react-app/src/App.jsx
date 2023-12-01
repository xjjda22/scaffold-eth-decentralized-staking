import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import "antd/dist/antd.css";
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";

import "./App.css";
// import 'antd/dist/antd.dark.css';

import { Row, Col, Button, Menu, Alert, List, Progress, Steps, Divider, Space } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import {
  useExchangePrice,
  useGasPrice,
  useUserProvider,
  useContractLoader,
  useContractReader,
  useEventListener,
  useBalance,
  useExternalContractLoader,
} from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, Balance, Address, CountDownTimer } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import { Hints, ExampleUI, Subgraph } from "./views";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";

const humanizeDuration = require("humanize-duration");
const { Step } = Steps;

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    📡 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS["kovan"]; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
const mainnetProvider = new JsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID);
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID)

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new JsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

let metamaskConnected = false;

const addressAustin = "austingriffith.eth";
const addressHarry = "0x73f058812ee1FaA73e429e9fE7FCa23Ec6859096";

function App(props) {
  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork, mainnetProvider, process.env.REACT_APP_POLLING);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast", process.env.REACT_APP_POLLING);
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  if (DEBUG) console.log("👩‍💼 selected address:", address);

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  if (DEBUG) console.log("🏠 localChainId", localChainId);

  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId;
  if (DEBUG) console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider);
  if (DEBUG) console.log("📝 readContracts", readContracts);

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider);
  if (DEBUG) console.log("🔐 writeContracts", writeContracts);

  //keep track of contract balance to know how much has been staked total:
  const stakerContractBalance = useBalance(
    localProvider,
    readContracts && readContracts.Staker.address,
    process.env.REACT_APP_POLLING,
  );
  const stakerContractBalanceEth = stakerContractBalance && formatEther(stakerContractBalance);
  if (DEBUG) console.log("💵 stakerContractBalance", stakerContractBalance);

  //keep track of total 'threshold' needed of ETH
  const threshold = useContractReader(readContracts, "Staker", "threshold", "", process.env.REACT_APP_POLLING);
  const thresholdEth = threshold && formatEther(threshold);
  console.log("💵 threshold:", threshold);

  // keep track of a variable from the contract in the local React state:
  const balanceStaked = useContractReader(
    readContracts,
    "Staker",
    "balances",
    [address],
    process.env.REACT_APP_POLLING,
  );
  const balanceStakedEth = balanceStaked && formatEther(balanceStaked);
  console.log("💸 balanceStaked:", balanceStaked);

  //📟 Listen for broadcast events
  const stakeEvents = useEventListener(readContracts, "Staker", "Stake", localProvider, process.env.REACT_APP_POLLING);
  console.log("📟 stake events:", stakeEvents);

  // keep track of a variable from the contract in the local React state:
  const timeLeft = useContractReader(readContracts, "Staker", "timeLeft", "", process.env.REACT_APP_POLLING);
  console.log("⏳ timeLeft:", timeLeft && timeLeft.toNumber());

  const complete = useContractReader(
    readContracts,
    "ExampleExternalContract",
    "completed",
    "",
    process.env.REACT_APP_POLLING,
  );
  console.log("✅ complete:", complete);
  const fail = useContractReader(readContracts, "Staker", "failed", "", process.env.REACT_APP_POLLING);
  console.log("✅ fail:", fail);

  const exampleExternalContractBalance = useBalance(
    localProvider,
    readContracts && readContracts.ExampleExternalContract.address,
    process.env.REACT_APP_POLLING,
  );
  if (DEBUG) console.log("💵 exampleExternalContractBalance", exampleExternalContractBalance);

  let completeDisplay = "";
  let checkpointDisplay = "";
  if (complete) {
    completeDisplay = (
      <div style={{ margin: 25, padding: 25, fontWeight: "bolder", borderRadius: 12 }} class="grad_freshmilk">
        🚀 🎖 🚀 <br /> - Staking App triggered `ExampleExternalContract` - <br /> 🎊 🎉 🎊 <br />
        <Balance balance={exampleExternalContractBalance} fontSize={64} /> ETH staked!
      </div>
    );
    checkpointDisplay = "Staking Goal reached!! Thanks for supporting ";
  } else {
    checkpointDisplay = timeLeft && timeLeft == 0 ? "please click execute to complete staking." : ".........";
  }

  if (fail == true) {
    checkpointDisplay = "Staking Goal not reached: user can withdraw their funds";
  }

  let timeLeftDisplay = "";
  if (timeLeft) {
    timeLeftDisplay = <CountDownTimer totalSeconds={timeLeft.toNumber()} />;
  }

  let networkDisplay = "";
  if (localChainId && selectedChainId && localChainId != selectedChainId) {
    networkDisplay = (
      <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
        <Alert
          message={"⚠️ Wrong Network"}
          description={
            <div>
              You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on{" "}
              <b>{NETWORK(localChainId).name}</b>.
            </div>
          }
          type="error"
          closable={false}
        />
      </div>
    );
  } else {
    networkDisplay = (
      <div style={{ zIndex: 2, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
    metamaskConnected = true;
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  // let faucetHint = ""
  // const [ faucetClicked, setFaucetClicked ] = useState( false );
  //   if(!faucetClicked&&localProvider&&localProvider._network&&localProvider._network.chainId==31337&&yourLocalBalance&&formatEther(yourLocalBalance)<=0){
  //   faucetHint = (
  //     <div style={{padding:16}}>
  //       <Button type={"primary"} onClick={()=>{
  //         faucetTx({
  //           to: address,
  //           value: parseEther("0.01"),
  //         });
  //         setFaucetClicked(true)
  //       }}>
  //         💰 Grab funds from the faucet ⛽️
  //       </Button>
  //     </div>
  //   )
  // }

  return (
    <div className="App bottomAnim grad_glasswater">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      {networkDisplay}
      <BrowserRouter>
        <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              Staker UI
            </Link>
          </Menu.Item>
          <Menu.Item key="/contracts">
            <Link
              onClick={() => {
                setRoute("/contracts");
              }}
              to="/contracts"
            >
              Debug Contracts
            </Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
            <div style={{ padding: 8, marginTop: 32 }}>
              <Steps size="small" direction="vertical">
                <Step
                  title="Network"
                  description=" please connect to kovan testnet."
                  status={metamaskConnected ? "finish" : "process"}
                />
                <Step
                  title="CountDown"
                  description={timeLeft == 0 ? "time passed : click to restart" : " still in progress."}
                  status={timeLeft == 0 ? "finish" : "process"}
                />
                <Step title="Stake" description="start with 0.1 ether" status={balanceStaked > 0 ? "finish" : "wait"} />
                <Step
                  title="Check Point"
                  description={checkpointDisplay}
                  status={timeLeft == 0 ? (fail == true || complete == true ? "finish" : "process") : "wait"}
                />
                {/*<Step title="todo - Voting" 
                    description=
                    <Steps direction="horizontal" size="small">
                      <Step title="first phase voting" description="votes: 51% - funds:15%" status="wait"/>
                      <Step title="second phase voting" description="votes: 51% - funds:15%" status="wait"/>
                      <Step title="third phase voting" description="votes: 51% - funds:15%" status="wait"/>
                    </Steps> 
                    status="wait" />*/}
              </Steps>
            </div>
            {completeDisplay}
            <div style={{ margin: 25, padding: 25, fontWeight: "bolder", borderRadius: 12 }} class="grad_deeprelief">
              <h2>CountDown</h2>
              {timeLeftDisplay}
            </div>
            <div style={{ margin: 25, padding: 25, fontWeight: "bolder", borderRadius: 12 }} class="grad_deeprelief">
              <h3>Total staked</h3>
              <Progress
                type="circle"
                percent={(stakerContractBalanceEth * 100) / thresholdEth}
                format={() => `${stakerContractBalanceEth}/${thresholdEth}`}
              />
              <div style={{ padding: 8 }}>
                <Button
                  type={"primary"}
                  shape="round"
                  size="large"
                  onClick={() => {
                    tx(writeContracts.Staker.execute());
                  }}
                >
                  📡 Execute! - Complete staking
                </Button>
              </div>
            </div>

            <div style={{ padding: 8 }}>
              <Divider />
              <h3>You staked</h3>
              <Balance balance={balanceStaked} fontSize={64} />
              <div style={{ padding: 8 }}>
                <Space>
                  <Button
                    type={"primary"}
                    shape="round"
                    size="large"
                    onClick={() => {
                      tx(writeContracts.Staker.stake({ value: parseEther("0.1") }));
                    }}
                  >
                    🥩 Stake 0.1 ETH!
                  </Button>
                  <Button
                    type={"primary"}
                    shape="round"
                    size="large"
                    onClick={() => {
                      tx(writeContracts.Staker.withdraw(address));
                    }}
                  >
                    🏧 Withdraw
                  </Button>
                </Space>
              </div>
              <Divider />
            </div>

            <div style={{ padding: 8 }}>
              <h3> Restart Staking</h3>
              <Button
                type={"primary"}
                shape="round"
                size="large"
                onClick={() => {
                  tx(writeContracts.Staker.reStart(120, 1));
                }}
              >
                ♻️ Restart
              </Button>
              <Divider />
            </div>

            {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

            <div
              style={{
                width: 500,
                margin: "auto",
                marginTop: 25,
                paddingTop: 25,
                fontWeight: "bolder",
                borderRadius: 12,
              }}
              class="grad_deeprelief"
            >
              <h3>Stake Events</h3>

              <List
                dataSource={stakeEvents}
                renderItem={item => {
                  return (
                    <List.Item key={item[0] + item[1] + item.blockNumber}>
                      <Space>
                        ✴️
                        <Address
                          value={item[0]}
                          // ensProvider={mainnetProvider}
                          fontSize={16}
                        />
                        =>
                        <Balance balance={item[1]} />
                      </Space>
                      ✴️
                    </List.Item>
                  );
                }}
              />
              <Divider />
            </div>
          </Route>
          <Route path="/contracts">
            <Contract
              name="Staker"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
            <Contract
              name="ExampleExternalContract"
              signer={userProvider.getSigner()}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
            />
          </Route>
        </Switch>
      </BrowserRouter>

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <Account
          address={address}
          localProvider={localProvider}
          userProvider={userProvider}
          // mainnetProvider={mainnetProvider}
          // price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
        {/*faucetHint*/}
      </div>

      <div style={{ padding: 30 }}>
        Created by 👨‍💼 &nbsp;
        <Address value={addressAustin} ensProvider={mainnetProvider} fontSize={16} />
        <br />
        developed by 👨‍💼 &nbsp;
        <Address value={addressHarry} ensProvider={mainnetProvider} fontSize={16} />
      </div>

      <div style={{ marginTop: 20, opacity: 0.6 }}>
        <a
          target="_blank"
          style={{ padding: 10, color: "#000" }}
          href="https://github.com/austintgriffith/scaffold-eth"
        >
          🍴 Scaffold-eth Fork me!
        </a>
        <br />
        <a
          target="_blank"
          style={{ padding: 10, color: "#000" }}
          href="https://github.com/xjjda22/scaffold-eth-decentralized-staking"
        >
          🍴 decentralized-staking-eth Fork me!
        </a>
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 10, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={14}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={10} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          {/*<Col span={8} style={{ textAlign: "center", opacity: 1 }}>
             <Button
               onClick={() => {
                 window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
               }}
               size="large"
               shape="round"
             >
               <span style={{ marginRight: 8 }} role="img" aria-label="support">
                 💬
               </span>
               Support
             </Button>
           </Col>*/}
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              localProvider &&
              localProvider.connection &&
              localProvider.connection.url &&
              localProvider.connection.url.indexOf(window.location.hostname) >= 0 &&
              !process.env.REACT_APP_PROVIDER &&
              price > 1 ? (
                <Faucet
                  localProvider={localProvider}
                  // price={price}
                  // ensProvider={mainnetProvider}
                />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  metamaskConnected = false;
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

window.ethereum &&
  window.ethereum.on("chainChanged", chainId => {
    setTimeout(() => {
      window.location.reload();
    }, 1);
  });

export default App;
