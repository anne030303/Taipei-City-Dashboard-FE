# <img src='src/assets/images/TUIC.svg' height='28'> Taipei City Dashboard Open Source FE

## Taipei Codefest 2023

Hey! Before you go any further, we would like to invite you to participate in an exciting hackathon event on Nov 18 - 19 this year.

<img width="200" alt="Codefest_Black" src="https://github.com/tpe-doit/Taipei-City-Dashboard-FE/assets/13110501/29ebed08-a63d-4fd5-8bd5-e4c423f4e4d4">

Taipei Codefest is hosted by the Taipei City Government to promote and accelerate the open-source effort of Taipei City Dashboard. Contestants will attempt to create more than 4 new components for Taipei City Dashboard in 32 hours. With a top prize of NT$300,000 and unlimited food during the contest, this is definitely an opportunity you wouldn't want to miss. Check out more information on the hackathon's official site: https://codefest.taipei

## Introduction

Taipei City Dashboard is a data visualization platform developed by [Taipei Urban Intelligence Center (TUIC)](https://tuic.gov.taipei/en).

Our main goal is to create a comprehensive data visualization tool to assist in Taipei City policy decisions. This was achieved through the first version of the Taipei City Dashboard, which displayed a mix of internal and open data, seamlessly blending statistical and geographical data.

Fast forward to mid-2023, as Taipei City’s open data ecosystem matured and expanded, our vision gradually expanded as well. We aimed not only to aid policy decisions but also to keep citizens informed about the important statistics of their city. Given the effectiveness of this tool, we also hoped to publicize the codebase for this project so that any relevant organization could easily create a similar data visualization tool of their own.

Our dashboard, made yours.

Based on the above vision, we decided to begin development on Taipei City Dashboard 2.0. Unlike its predecessor, Taipei City Dashboard 2.0 will be a public platform instead of an internal tool. The codebase for Taipei City Dashboard will also be open-sourced, inviting all interested parties to participate in the development of this platform.

We have since completed the initial layouts and basic functionalities of Taipei City Dashboard 2.0 and feel the time is right to begin sharing the development process with the general public. From now on, you will be able to suggest features and changes to Taipei City Dashboard and develop the platform alongside us. We are excited for you to join Taipei City Dashboard’s journey!

Please refer to the docs for the [Chinese Version](https://tuic.gov.taipei/documentation/front-end/introduction) (and click on the "switch languages" icon in the top right corner).

[Demo](https://tuic.gov.taipei/dashboard-demo) | [License](https://github.com/tpe-doit/Taipei-City-Dashboard-FE/blob/main/LICENSE) | [Code of Conduct](https://github.com/tpe-doit/Taipei-City-Dashboard-FE/blob/main/.github/CODE_OF_CONDUCT.md) | [Contribution Guide](https://tuic.gov.taipei/documentation/front-end/contribution-overview)

## New Feature by Wee Win

### charts

1. CustomBubbleChart
<img width="500" alt="image" src="https://github.com/anne030303/Taipei-City-Dashboard-FE/assets/24452337/cca3aa0c-2344-4d28-89ba-02a6d207e30c">

2. RealTimeChart
<a href="http://www.youtube.com/watch?feature=player_embedded&v=ec0wCuQICsY" target="_blank">
    <img src="http://img.youtube.com/vi/ec0wCuQICsY/0.jpg" alt="IMAGE ALT TEXT HERE" width="500" height="375" border="10" />
</a>

### Map

1. StackedCircleMapLayer
<img width="500" alt="image" src="https://github.com/anne030303/Taipei-City-Dashboard-FE/assets/24452337/38102585-269f-453c-935c-2d7c87ce88eb">

2. 3D Building Illuminator
<img width="500" alt="image" src="https://github.com/anne030303/Taipei-City-Dashboard-FE/assets/24452337/49bc1cde-35d4-43d9-b4ab-75ca4fb98655">

4. HexagonMapLayer
<img width="500" alt="image" src="https://github.com/anne030303/Taipei-City-Dashboard-FE/assets/24452337/11054692-8674-40e2-a876-4d0122cdaa83">
<img width="500" alt="image" src="https://github.com/anne030303/Taipei-City-Dashboard-FE/assets/24452337/9eed5776-0cfe-491f-b5d7-df3046bc6657">


### Others

1. Map Layer Animation (StackedCircleMapLayer, HexagonMapLayer)
<a href="http://www.youtube.com/watch?feature=player_embedded&v=_mzw6ApchxI" target="_blank">
    <img src="http://img.youtube.com/vi/_mzw6ApchxI/0.jpg" alt="IMAGE ALT TEXT HERE" width="500" height="375" border="10" />
</a>

<a href="http://www.youtube.com/watch?feature=player_embedded&v=ec0wCuQICsY" target="_blank">
    <img src="http://img.youtube.com/vi/ec0wCuQICsY/0.jpg" alt="IMAGE ALT TEXT HERE" width="500" height="375" border="10" />
</a>

2. Auto Navigation
<a href="http://www.youtube.com/watch?feature=player_embedded&v=LamWG-6kuRA" target="_blank">
    <img src="http://img.youtube.com/vi/LamWG-6kuRA/0.jpg" alt="IMAGE ALT TEXT HERE" width="500" height="375" border="10" />
</a>

3. Map Filter
    1. Two-Dimensional Filtering
    2. Multi-Selection Enhancement
<a href="http://www.youtube.com/watch?feature=player_embedded&v=t7s_YFlg5DE" target="_blank">
    <img src="http://img.youtube.com/vi/t7s_YFlg5DE/0.jpg" alt="IMAGE ALT TEXT HERE" width="500" height="375" border="10" />
</a>
(see branch map-filter)

<a href="http://www.youtube.com/watch?feature=player_embedded&v=isLrzFX_K-g" target="_blank">
    <img src="http://img.youtube.com/vi/isLrzFX_K-g/0.jpg" alt="IMAGE ALT TEXT HERE" width="500" height="375" border="10" />
</a>

4. Chart Zoom Popup
<img width="500" alt="image" src="https://github.com/anne030303/Taipei-City-Dashboard-FE/assets/24452337/200700c1-fe13-429b-9530-ae32fa4783ca">


## Quick Start

### Docker

1. Install [Docker](https://www.docker.com/products/docker-desktop/) on your computer and start running it.
2. Fork this repository then clone the project to your computer. Execute `pwd` (mac) or `cd` in the repository terminal to get the complete path.
3. Execute the following command in the system terminal and replace "<repository path>" with the path you got in step 2.

```bash
docker run -v <repository path>:/opt/Taipei-City-Dashboard-FE -p 80:80 -it node:18.18.1-alpine3.18  sh
```

4. Execute the following commands to enter the project folder and install packages.

```bash
cd /opt/Taipei-City-Dashboard-FE
npm install
```

5. You should now be able to locally host this project by executing `npm run dev` in the respository terminal.
6. Refer to the [Docs](https://tuic.gov.taipei/documentation/front-end/project-setup) to complete further configurations.

### Local Environment

1. Download [Node.js](https://nodejs.org/en) on your computer.
2. Fork this repository then clone the project to your computer.
3. Execute `npm install` in the respository terminal
4. You should now be able to locally host this project by executing `npm run dev` in the respository terminal.
5. Refer to the [Docs](https://tuic.gov.taipei/documentation/front-end/project-setup) to complete further configurations.

## Documentation

Check out the complete documentation for Taipei City Dashboard FE [here](https://tuic.gov.taipei/documentation).

## Contributors

Many thanks to the contributors to this project!

<a href="https://github.com/tpe-doit/Taipei-City-Dashboard-FE/graphs/contributors">
<img src="https://contrib.rocks/image?repo=tpe-doit/Taipei-City-Dashboard-FE" />
</a>
