# borrow-module

```
yarn install --frozen-lockfile

npx hardhat test
```


# Deployed contracts

| network    | contract          | address                                                                                                                              |
|:-----------|:------------------|:-------------------------------------------------------------------------------------------------------------------------------------|
| ethereum   |                   |                                                                                                                                      |
|            | BorrowModule      | [0xAfaB0427Be2dC15199e24BE8646792cdc6f4dEc3](https://etherscan.io/address/0xAfaB0427Be2dC15199e24BE8646792cdc6f4dEc3)                |
|            | ParametersStorage | [0xf82f05b89d2432548263E3A01b18d8A5696b9A8E](https://etherscan.io/address/0xf82f05b89d2432548263E3A01b18d8A5696b9A8E)                |
|            | AssetViewer       | [0xBA40A7e0932B3f2256eA547e8dC515CB86c8d136](https://etherscan.io/address/0xBA40A7e0932B3f2256eA547e8dC515CB86c8d136)                |
| bsc        |                   |                                                                                                                                      |
|            | BorrowModule      | [0x2E0f13D18D210dd62EFf4818084B10697803e62C](https://bscscan.com/address/0x2E0f13D18D210dd62EFf4818084B10697803e62C)                 |
|            | ParametersStorage | [0x89a00327718B811571A6fA536FE51579442f5579](https://bscscan.com/address/0x89a00327718B811571A6fA536FE51579442f5579)                 |
|            | AssetViewer       | [0x3Eb712991e6a7d4Cbc43A62266b7bfF143D8866B](https://bscscan.com/address/0x3Eb712991e6a7d4Cbc43A62266b7bfF143D8866B)                 |
| gnosis     |                   |                                                                                                                                      |
|            | BorrowModule      | [0x764c0dfd3a37d02Ce3cDfeE4C0280B082bc34F0B](https://blockscout.com/xdai/mainnet/address/0x764c0dfd3a37d02Ce3cDfeE4C0280B082bc34F0B) |
|            | ParametersStorage | [0x24425c2f419087fc85127B5B7e314d668193F705](https://blockscout.com/xdai/mainnet/address/0x24425c2f419087fc85127B5B7e314d668193F705) |
|            | AssetViewer       | [0x32dC5dF6A4986FE6BcDf8549C0679d943a60892B](https://blockscout.com/xdai/mainnet/address/0x32dC5dF6A4986FE6BcDf8549C0679d943a60892B) |
| avalanche  |                   |                                                                                                                                      |
|            | BorrowModule      | [0xdfFE58013aEA8850767926892C9B176364E22c83](https://snowtrace.io/address/0xdfFE58013aEA8850767926892C9B176364E22c83)                |
|            | ParametersStorage | [0x2318Fa4590B8FBC24C7703C8FeaAe63337D8213d](https://snowtrace.io/address/0x2318Fa4590B8FBC24C7703C8FeaAe63337D8213d)                |
|            | AssetViewer       | [0x26Ee42567C1de35f59c448A54d3CB55d1D1B6c2F](https://snowtrace.io/address/0x26Ee42567C1de35f59c448A54d3CB55d1D1B6c2F)                |
| arbitrum   |                   |                                                                                                                                      |
|            | BorrowModule      | [0x38f3E3261c72652EE259a6ed8D2BC0Ade097DEb7](https://arbiscan.io/address/0x38f3E3261c72652EE259a6ed8D2BC0Ade097DEb7)                 |
|            | ParametersStorage | [0x50B17e535D6b19872a2f968BEaE4d691A7694E27](https://arbiscan.io/address/0x50B17e535D6b19872a2f968BEaE4d691A7694E27)                 |
|            | AssetViewer       | [0xaDbB07E36874c08ad663e3880CFBd38e9704F98d](https://arbiscan.io/address/0xaDbB07E36874c08ad663e3880CFBd38e9704F98d)                 |
| optimism   |                   |                                                                                                                                      |
|            | BorrowModule      | [0x4676E053d6ea1E907aAf3bD69a2D81462Eba0e00](https://optimistic.etherscan.io/address/0x4676E053d6ea1E907aAf3bD69a2D81462Eba0e00)     |
|            | ParametersStorage | [0x6764b0Ed665F60BBECAfA4Fa697C2851612EEA65](https://optimistic.etherscan.io/address/0x6764b0Ed665F60BBECAfA4Fa697C2851612EEA65)     |
|            | AssetViewer       | [0xcb034A4B45905f03179ABcE17f15a678d88dA4c8](https://optimistic.etherscan.io/address/0xcb034A4B45905f03179ABcE17f15a678d88dA4c8)     |
| polygon    |                   |                                                                                                                                      |
|            | BorrowModule      | [0x68628f2294B5e1e7BED8bB5Ab9351d7cd3f019A0](https://polygonscan.com/address/0x68628f2294B5e1e7BED8bB5Ab9351d7cd3f019A0)             |
|            | ParametersStorage | [0xB502208B09889390C576BdA3f2c8d78B6C0d9b37](https://polygonscan.com/address/0xB502208B09889390C576BdA3f2c8d78B6C0d9b37)             |
|            | AssetViewer       | [0x7057f74f59d5AC27b88d0b2Ba3E8c98bE0cadc44](https://polygonscan.com/address/0x7057f74f59d5AC27b88d0b2Ba3E8c98bE0cadc44)             |
| aurora     |                   |                                                                                                                                      |
|            | BorrowModule      | [0xb47F2Ca3e0c78EB0e06ebf1293b451d2cf97087d](https://aurorascan.dev/address/0xb47F2Ca3e0c78EB0e06ebf1293b451d2cf97087d)              |
|            | ParametersStorage | [0x7546FBaDC41208Dd4713E7c0353c9263CBBF702C](https://aurorascan.dev/address/0x7546FBaDC41208Dd4713E7c0353c9263CBBF702C)              |
|            | AssetViewer       | [0x6D06724AD0A7F3734498c897381660c672e7ae75](https://aurorascan.dev/address/0x6D06724AD0A7F3734498c897381660c672e7ae75)              |
| boba       |                   |                                                                                                                                      |
|            | BorrowModule      | [0x32D6c1d3E5A11dc118eC9681A6d2573CAc347B6b](https://bobascan.com/address/0x32D6c1d3E5A11dc118eC9681A6d2573CAc347B6b)                |
|            | ParametersStorage | [0x3f64d234CeD2817c72f3a70ed7476c8622ffb4ff](https://bobascan.com/address/0x3f64d234CeD2817c72f3a70ed7476c8622ffb4ff)                |
|            | AssetViewer       | [0xb075420578c0DfA8C341C9632f76c2100F345283](https://bobascan.com/address/0xb075420578c0DfA8C341C9632f76c2100F345283)                |
| moonbeam   |                   |                                                                                                                                      |
|            | BorrowModule      | [0x1848D8cC1609fFaC7a50a6d754a172EfE317D2E2](https://moonscan.io/address/0x1848D8cC1609fFaC7a50a6d754a172EfE317D2E2)                 |
|            | ParametersStorage | [0x29be5b554e3E8F94CdDd2639EF96242eC032285A](https://moonscan.io/address/0x29be5b554e3E8F94CdDd2639EF96242eC032285A)                 |
|            | AssetViewer       | [0x3657e92099D42D828fe37aDFb36eEE7e90d157a2](https://moonscan.io/address/0x3657e92099D42D828fe37aDFb36eEE7e90d157a2)                 |
| moonriver  |                   |                                                                                                                                      |
|            | BorrowModule      | [0x547eCCc358845C49102CF9BB1C91bBa671A4Ce12](https://moonriver.moonscan.io/address/0x547eCCc358845C49102CF9BB1C91bBa671A4Ce12)       |
|            | ParametersStorage | [0x4a5A73028Fa100aCe58Dd9C438245d9FdBf88bc5](https://moonriver.moonscan.io/address/0x4a5A73028Fa100aCe58Dd9C438245d9FdBf88bc5)       |
|            | AssetViewer       | [0xE92f4D9F66175f69A90060cad92444E1df015859](https://moonriver.moonscan.io/address/0xE92f4D9F66175f69A90060cad92444E1df015859)       |
| okc        |                   |                                                                                                                                      |
|            | BorrowModule      | [0x6b50608351866bDC5C8612F433341954Cf41CA98](https://www.oklink.com/en/okc/address/0x6b50608351866bDC5C8612F433341954Cf41CA98)       |
|            | ParametersStorage | [0xA35d760Af6BA0538564D0a8C6D7390f4Cdd8B56F](https://www.oklink.com/en/okc/address/0xA35d760Af6BA0538564D0a8C6D7390f4Cdd8B56F)       |
|            | AssetViewer       | [0xBDA6F9d3F7f0512324A9305F321Ad871Ba8C5617](https://www.oklink.com/en/okc/address/0xBDA6F9d3F7f0512324A9305F321Ad871Ba8C5617)       |
| bittorrent |                   |                                                                                                                                      |
|            | BorrowModule      | [0x48605444e47123DD1732DfA6af7b5640Ee451438](https://bttcscan.com/address/0x48605444e47123DD1732DfA6af7b5640Ee451438)                |
|            | ParametersStorage | [0x5b93BD11D5c778000Ff72a04590417A13CF9cAa3](https://bttcscan.com/address/0x5b93BD11D5c778000Ff72a04590417A13CF9cAa3)                |
|            | AssetViewer       | [0x044f58CDC9Bbe56A1cCDB1b95867792853ee6A81](https://bttcscan.com/address/0x044f58CDC9Bbe56A1cCDB1b95867792853ee6A81)                |
| celo       |                   |                                                                                                                                      |
|            | BorrowModule      | [0x9627385D21387e15c3F306eFc4247C0123f75Dd5](https://celoscan.io/address/0x9627385D21387e15c3F306eFc4247C0123f75Dd5)                 |
|            | ParametersStorage | [0x03D448B704F52eE966De0770708ea226640e6c26](https://celoscan.io/address/0x03D448B704F52eE966De0770708ea226640e6c26)                 |
|            | AssetViewer       | [0x2CAdE59D443023fe27656014DD346f70b00fEA34](https://celoscan.io/address/0x2CAdE59D443023fe27656014DD346f70b00fEA34)                 |
| cronos     |                   |                                                                                                                                      |
|            | BorrowModule      | [0x14789A4e84dC814CE90010De479e535633f9b13f](https://cronoscan.com/address/0x14789A4e84dC814CE90010De479e535633f9b13f)               |
|            | ParametersStorage | [0x72099782D2aB3Bb9b650eAD67970D817A272F4ac](https://cronoscan.com/address/0x72099782D2aB3Bb9b650eAD67970D817A272F4ac)               |
|            | AssetViewer       | [0x7B50c34069c5E007df84e2CCd831365e9BF396bf](https://cronoscan.com/address/0x7B50c34069c5E007df84e2CCd831365e9BF396bf)               |
| heco       |                   |                                                                                                                                      |
|            | BorrowModule      | [0x44471d1789C52a10117c16c06a9fE26fCAa66490](https://www.hecoinfo.com/en-us/address/0x44471d1789C52a10117c16c06a9fE26fCAa66490)      |
|            | ParametersStorage | [0x3779F1c123aFD9de977f86fccc62e8aE94b80b11](https://www.hecoinfo.com/en-us/address/0x3779F1c123aFD9de977f86fccc62e8aE94b80b11)      |
|            | AssetViewer       | [0x6Af36cD9a3fB12A868d41AcEc43aAf14882Ad005](https://www.hecoinfo.com/en-us/address/0x6Af36cD9a3fB12A868d41AcEc43aAf14882Ad005)      |
| klaytn     |                   |                                                                                                                                      |
|            | BorrowModule      | [0x71Fc539d79a06c263C6dC437d4381Aa512F61f33](https://scope.klaytn.com/account/0x71Fc539d79a06c263C6dC437d4381Aa512F61f33)            |
|            | ParametersStorage | [0x86055E9870c87972f5508adbF4ae59a6Fc2D98b6](https://scope.klaytn.com/account/0x86055E9870c87972f5508adbF4ae59a6Fc2D98b6)            |
|            | AssetViewer       | [0x4D4098D30861e4b563e544012D165E051b438342](https://scope.klaytn.com/account/0x4D4098D30861e4b563e544012D165E051b438342)            |
| oasis      |                   |                                                                                                                                      |
|            | BorrowModule      | [0x44F5f70c6B6205db695309fd81B4a82e71368134](https://explorer.emerald.oasis.dev/address/0x44F5f70c6B6205db695309fd81B4a82e71368134)  |
|            | ParametersStorage | [0x864df2528eF58ac881a425f7811783543D4c271f](https://explorer.emerald.oasis.dev/address/0x864df2528eF58ac881a425f7811783543D4c271f)  |
|            | AssetViewer       | [0x864c35120BFb2c45143354896d9CA13260Fd8C30](https://explorer.emerald.oasis.dev/address/0x864c35120BFb2c45143354896d9CA13260Fd8C30)  |
| syscoin    |                   |                                                                                                                                      |
|            | BorrowModule      | [0x8664BEf8026230fd2aaB4bd78C4C1Ee5C3f6B46f](https://explorer.syscoin.org/address/0x8664BEf8026230fd2aaB4bd78C4C1Ee5C3f6B46f)        |
|            | ParametersStorage | [0x7989C52b8e10663025cDa93Dc6c0B653E6f60fE2](https://explorer.syscoin.org/address/0x7989C52b8e10663025cDa93Dc6c0B653E6f60fE2)        |
|            | AssetViewer       | [0x3d259A822AF4528F1672680D5568bD43c0D2425b](https://explorer.syscoin.org/address/0x3d259A822AF4528F1672680D5568bD43c0D2425b)        |
