import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, contractStore } from "../../../store/store";
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";
import Web3 from "web3";
import voteAbi from "../../abi/ercvotingABI";
import axios from "axios";

function Write() {
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [period, setPeriod] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { account, proposedId, collectionId, typeStatus, myProfile, duration } =
    useStore(); //collectionId cryptopunks: 0, bayc: 1, mayc:2
  const [collectionInfo, setCollectionInfo] = useState({
    collectionpic: "",
    name: "",
    nftname: "",
  });
  const { daoVotingContract, smAddress } = contractStore();
  const [type2, setType2] = useState("sell");
  let propose = 0;

  useEffect(() => {
    setInfo();
  }, []);

  const setInfo = () => {
    if (collectionId === 0) {
      setCollectionInfo({
        collectionpic:
          "https://img.seadn.io/files/e52f773e06875799d22df815799460e9.png?fit=max&w=1000",
        name: "Crypto Punks",
        nftname: "#1082",
      });
    }
    if (collectionId === 1) {
      setCollectionInfo({
        collectionpic:
          "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB?auto=format&w=1920",
        name: "Bored Ape Yacht Club",
        nftname: "#3152",
      });
    }
    if (collectionId === 2) {
      setCollectionInfo({
        collectionpic:
          "https://i.seadn.io/gae/lHexKRMpw-aoSyB1WdFBff5yfANLReFxHzt1DOj_sg7mS14yARpuvYcUtsyyx-Nkpk6WTcUPFoG53VnLJezYi8hAs0OxNZwlw6Y-dmI?auto=format&w=1920",
        name: "Mustant Ape Yacht Club",
        nftname: "#5082",
      });
    }
  };

  const handleChangeType = (e) => {
    setType(e.target.value);

    if (e.target.value == "T") {
      setType2("sell");
    }
    if (e.target.value == "S") {
      setType2("staking");
    }
    if (e.target.value == "E") {
      setType2("etc");
    }
  };

  const handleChangePeriod = (e) => {
    if (e.target.value === "5") {
      setPeriod(5 * 60);
      useStore.setState({ duration: 5 * 60 });
    } else if (e.target.value === "10") {
      setPeriod(10 * 60);
      useStore.setState({ duration: 10 * 60 });
    } else {
      setPeriod(0);
    }
  };

  const handleChangeTitle = (e) => {
    setTitle(e.target.value);
  };

  const handleChangeDes = (e) => {
    setDescription(e.target.value);
  };

  //안건 작성 후 실행되는 function
  const handleSubmit = async () => {
    let metaDataUrl = "";
    let duration = period * 60;
    const projectId = "2GwlTAQdyyInesaPvwtta8CDq7z";
    const projectSecret = "bc12b7f49f073069463cb461e210777c";
    const auth =
      "Basic " +
      Buffer.from(projectId + ":" + projectSecret).toString("base64"); //basic 띄어쓰기 꼭 넣기

    const client = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: auth,
      },
    });

    const metaData = {
      address: account,
      collectionName: collectionId,
      title: title,
      description: description,
      agendaType: type,
      duration: 300, //staking 시간 sell = 0
    };

    const metaIpfs = await client.add(JSON.stringify(metaData)); //메타데이터 ipfs CID
    metaDataUrl = "https://steemeight.infura-ipfs.io/ipfs/" + metaIpfs.path; //cid
    console.log(metaDataUrl);

    //작성 contract에 보내기. address, agenda type, period, metadata uri (ipfs)
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(voteAbi, daoVotingContract);
    const transaction = {
      from: account,
      gas: 30000000, //100만
      gasPrice: web3.utils.toWei("1.5", "gwei"),
    };
    await contract.methods
      .suggestion(smAddress, collectionId, account, type, metaDataUrl, 300)
      .call()
      .then((res) => {
        console.log(res);
        propose = res[0];
        contract.methods
          .suggestion(smAddress, collectionId, account, type, metaDataUrl, 300)
          .send(transaction)
          .then((res) => {
            console.log(res);
            axios
              .post(
                `http://localhost:3001/community/${propose}`,
                {
                  collectionName: "Bored Ape Yacht Club",
                  nftName: "#3152",
                  address: account,
                  title,
                  description,
                  type: type2,
                  duration: period,
                },
                { Headers: { "Content-Type": "application/json" } }
              )
              .then((res) => {
                axios
                  .get(`http://localhost:3001/community/${propose}`)
                  .then((res) => {
                    //res.data[0].createDateTime
                    //5분 후 function result 자동실행.
                    setTimeout(() => {
                      checkResult();
                    }, 30000);
                    //agree 답 오면 community.js에 daration 띄워주기
                    //끝나면 voting end로 바꿔주기
                  });
              });
          });
      });
  };
  const checkResult = async () => {
    const contract = new web3.eth.Contract(voteAbi, daoVotingContract);
    const web3 = new Web3(window.ethereum);
    await contract.methods
      .result(smAddress, collectionId, propose)
      .call()
      .then((res) => {
        console.log(res);
        if (res == "agree") {
          useStore.setState({ typeStatus: "agree" });
        }
      });
  };

  return (
    <div className="agenda-box">
      <div className="vertical-line"></div>
      <div className="agenda-img">
        <img src={collectionInfo.collectionpic} className="agenda-img" />
      </div>
      <div className="agenda-title">
        <p>{collectionInfo.name}</p>
        <p style={{ fontSize: "20px", color: "#CDFF00" }}>
          {collectionInfo.nftname}
        </p>
        <div className="write-box">
          <div className="agenda-profile-box">
            <img src={myProfile} className="agenda-profile"></img>
            <div className="agenda-single">
              <div className="agenda-address">
                {account.slice(0, 5)}...{account.slice(-3)}
              </div>
              <div>
                {" "}
                <label
                  for="type"
                  style={{ fontSize: "15px", marginLeft: "4px" }}
                >
                  Agenda type :
                </label>
                <select
                  onChange={handleChangeType}
                  value={type}
                  style={{ marginTop: "17px" }}
                  id="type"
                  key={type}
                >
                  <option value="T">Sell</option>
                  <option value="S">Staking</option>
                  <option value="E">ETC</option>
                </select>{" "}
                {type === "S" && (
                  <select
                    onChange={handleChangePeriod}
                    value={period}
                    id="period"
                    name="period"
                  >
                    <option value="" selected>
                      period
                    </option>
                    <option value="5">5 min</option>
                    <option value="10">10 min</option>
                  </select>
                )}
              </div>
            </div>
          </div>
          <input
            placeholder="Title..."
            className="agenda-input1"
            onChange={handleChangeTitle}
          ></input>
          <textarea
            placeholder="Description..."
            type="text"
            className="agenda-input2"
            onChange={handleChangeDes}
          ></textarea>
          <button className="write-btn" onClick={handleSubmit}>
            submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default Write;
