import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Meteor } from 'meteor/meteor'
import { withTracker } from 'meteor/react-meteor-data';
import { withStyles } from '@material-ui/core/styles';

import Redirect from 'react-router/Redirect'

import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Checkbox from '@material-ui/core/Checkbox';
import Link from '@material-ui/core/Link';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';

import { ClientStorage } from 'ClientStorage';

import { getDefaultProfile } from '/imports/api/users.js';

import { controlStyles } from '/imports/client/components/SharedStyles.jsx';

//import { homepageFiles } from '/public/files/homepageFiles';

class Info extends Component {
  constructor(props) {
    super(props);

    let dontshow = ClientStorage.has("dontshow-info") && ClientStorage.get("dontshow-info");
    console.log("init dontshow %s", dontshow)

    this.state = {
      dontshow: true,
      redirect: false
    }
  }

  doRedirect = (location) => () => {
    this.setState({redirect: location});
  }

  handleChangeCheckbox = () => event => {
    let dontshow = !(ClientStorage.has("dontshow-info") && ClientStorage.get("dontshow-info"));
    ClientStorage.set("dontshow-info", dontshow)
    this.setState({'dontshow': dontshow});
  };

  renderAppButtons() {
    const { classes } = this.props;

    return (
      <div>
        <Button className={classes.button} variant="contained" onClick={this.doRedirect('/').bind(this)} className={classes.button}>
            Rent a bike
        </Button>
        <Button className={classes.button} variant="contained" onClick={ this.doRedirect('/admin/objects').bind(this) } className={classes.button}>
          Manage your locks
        </Button>
        <div style={{display:'flex', justifyContent: 'space-around'}}>
          <FormControlLabel control={
              <Checkbox checked={this.state.dontshow===true
            }
            onChange={this.handleChangeCheckbox()} /> }
            label={'Skip this page in the future'} />
        </div>
      </div>
    )
  }

  render() {
    const { classes } = this.props;
    const { read } = this.state;
    const error = [read].filter(v => v).length !== 1;

    if(false!==this.state.redirect) {
      return (<Redirect to={this.state.redirect} />)
    }

    return (
      <div className={classes.base}>

        <Paper className={classes.paper}>

          <Typography className={classes.header} variant="h4">
            Lisk.Bike
          </Typography>

          {this.renderAppButtons()}

          <div className={classes.explainer}>
            <p data-info="Spacing"></p>
          </div>

          <Typography className={classes.header} variant="h6">
            Blockchain Proof of Concept
          </Typography>
          <Typography className={classes.explainer}>
            <Link href="https://lisk.io" target="_blank">Lisk</Link> is a blockchain application platform. Blockchain has a lot of benefits compared to traditional means of storing data on a public network, but the major downside is that the technology is very complex. The goal of the Lisk project is to take away the barrier to entry and make it easy for Javascript developers to build their application on the Blockchain. We like to showcase a Proof of Concept that can be made with the current state of the Lisk Software Development Kit. The application is called Lisk.Bike.
          </Typography>
          <Typography className={classes.explainer}>
            Cycling is a common mode of transport in The Netherlands, with 36% of the people listing the bicycle as their most frequent means of transport on a typical day. The Netherlands' busiest cycleway, Vredenburg in the city of Utrecht, sees some 32,000 cyclists on an average weekday, and up to 37,000 on peak days. There are several bicycle parking stations in Utrecht. In 2018 the largest one opened for 12,500 bicycles, which makes it the largest in The Netherlands.
          </Typography>
          <Typography className={classes.spotlight}>
            Times are changing and nowadays new concepts like 'bike sharing' are becoming much more popular. We want to make use of this concept, fit a bike with a GPS tracking lock, build a Javascript application and use the Lisk blockchain for the data registration. Information like who is using the bike, when and its location will be registered on the Lisk blockchain in its own separate side chain. We will build an easy mobile interface to register your usage via a QR code and you are on your way!
          </Typography>
          <div className={classes.imageline}>
            <div className={classes.explainerimage} style={{backgroundImage:'url("/files/homepageFiles/bike.png")'}} />
            <div className={classes.explainerimage} style={{backgroundImage:'url("/files/homepageFiles/lock.jpg")'}} />
            <div className={classes.explainerimage} style={{backgroundImage:'url("/files/homepageFiles/blockchain.png")'}} />
            <div className={classes.explainerimage} style={{backgroundImage:'url("/files/homepageFiles/app.png")'}} />
          </div>
          <Typography className={classes.header} variant="h6">
            Pitch
          </Typography>
          <div className={classes.explainer}>
            <p>
              <Link href="https://github.com/liskcenterutrecht/lisk.bike/graphs/contributors" target="_blank">We</Link> are very pragmatic and hands-on focussed. We do not spend time on fancy whitepapers, money on marketing or create fancy websites. This is our pitch and we like to build this PoC to learn and present the showcase.
            </p>
            <p><i>The PoC is:</i></p>
            <ul>
              <li>to learn how its done and get handson experience with the SDK;</li>
              <li>to give feedback to HQ how to improve documentation and development;</li>
              <li>to showcase a proof of concept what can be done with the Lisk alpha SDK;</li>
              <li>to inspire visitors/developers at the LCU to start building with the alpha SDK;</li>
            </ul>
            <p><i>The PoC is not:</i></p>
            <ul>
              <li>to showcase what the best application for blockchain technology is;</li>
              <li>to start a company;</li>
              <li>to showcase a valid businessmodel;</li>
              <li>to earn a profit.</li>
            </ul>
          </div>
          <Typography className={classes.header} variant="h6">
            App impression
          </Typography>
          <div className={classes.explainer}>
            <figure>
              <video autoPlay={true} loop={true} src="https://i.imgur.com/YOvpa19.mp4" />
              <figcaption>
                Proof of Concept mobile interface impression
              </figcaption>
            </figure>
            <p hidden>
              (Demo will be available in English)
            </p>
          </div>
          <Typography className={classes.header} variant="h6">
            Roadmap
          </Typography>
          <div className={classes.explainer}>
            <ol>
              <li>Create the concept - [ done ] / 2019-08-08</li>
              <li>Get the domain, rent a server and setup a website - [ done ] / 2019-08-09</li>
              <li>Get a team and agree on the project - [ done ] / 2019-08-09</li>
              <li>Setup the Lisk blockchain - [ done ] / 2019-08-09</li>
              <li>Community funding round - [ done ] / 2019-09-07</li>
              <li>Get a Bike and fit the lock - [ done ] / 2019-08-30</li>
              <li>Build the Javascript application & Side chain - [ done ] / 2019-11-4</li>
              <li>Build the mobile interface- [ busy ] / 2019-11-xx</li>
              <li>Showcase the result to the community in try-out at Lisk Center Utrecht [ upcoming ] / 2019-11-16</li>
              <li>Showcase the result to the community at Lisk.JS 2019 in Berlin [ upcoming ] / 2019-11-19</li>
              <li> Release bikes in Utrecht and Berlin to demonstrate this concept [ future ] </li>
            </ol>
          </div>

          <Typography className={classes.header} variant="h6">
            Result
          </Typography>
          <div className={classes.explainer}>
            <p>Lisk SDK proof of concept application combining various ideas and technologies into an interesting use case.
            And a working demonstration for all Lisk Center visitors/developers to inspire and start using the Lisk SDK.</p>
          </div>
          <div className={classes.spotlightcentered}>
            <p><b>We asked the community for 5000 LSK to build this Proof of Concept.</b></p>
            <p><b>Your Lisk donations to wallet address 12011343856710933463L made this project possible.</b></p>
            <p><b>THANK YOU</b></p>
          </div>
          <div className={classes.explainer}>
            <p>
              <i>All funding is spent on making this PoC. The bike, lock, website, domain, servers, coding, art, etc.
              These funds are not used to make a profit but to cover all the necessary costs.
              The thing we take away is learning a new technology.</i>
            </p>
          </div>
          <div className={classes.explainer}>
            <p>This project was supported by:</p>
            <ul>
              <li>Marc</li>
              <li>Caspar</li>
              <li>Eric</li>
              <li>Bart</li>
              <li>Albert</li>
              <li>Susanne</li>
              <li>JesusTheHun</li>
              <li>Joost</li>
            </ul>
          </div>
          <Typography className={classes.header} variant="h6">
            Code base
          </Typography>
          <div className={classes.explainer}>
            <p>
              All developed code has been added to the public domain (GitHub) so that interested parties can join and use the project results.
            </p>
            <p>
              The Lisk.Bike POC is based on the <Link href="http://common.bike/" href="_blank">CommonBike</Link> platform: an open source project that has been setup to stimulate bike sharing in The Netherlands. This allowed us to efficiently realize a working solution.
            </p>
            <p>
              A special thanks to Lisk community member <Link href="https://github.com/JesusTheHun/lisk-bike">Jesus the Hun</Link> for providing a code demo for the lisk-bike project.
            </p>
            <p>
              Find the <b>source code repositories</b> over here:
            </p>
            <ul>
              <li>
                <Link href="https://github.com/liskcenterutrecht/lisk.bike">
                  App, lock server & blockchain node
                </Link>
              </li>
            </ul>
          </div>

          <Typography className={classes.header} variant="h6">
            Publications
          </Typography>
          <div className={classes.explainer}>
            <ul>
              <li>
                <Link href="https://www.linkedin.com/posts/caspar-roelofs_liskbike-showcasing-custom-blockchain-transactions-activity-6597044489418756097-mZRz/" target="_blank">
                  Caspar on LinkedIn
                </Link>
              </li>
              <li>
                <Link href="https://medium.com/@GimlyBlockchain/lisk-bike-showcasing-custom-blockchain-transactions-and-sharing-lessons-da2b22f9b20c" target="_blank">
                  Lisk.Bike: showcasing custom blockchain transactions and sharing lessons
                </Link> (Medium)
              </li>
              <li>
                <Link href="https://www.liskmagazine.com/blog/2019/11/12/gimly-and-lisk-bike-to-collaborate-on-smart-bicycle-sharing-platform/" target="_blank">
                  Gimly and Lisk.Bike To Collaborate On Smart Bicycle Sharing Platform
                </Link> (Lisk Magazine)
              </li>
              <li>
                <Link href="https://lisk.io/events/lisk.js-2019" target="_blank">
                  Lisk.Bike Hands-On Developer Workshop
                </Link> (lisk.io)
              </li>
            </ul>
          </div>

          <div className={classes.explainer}>
            <p data-info="Spacing"></p>
          </div>

          {this.renderAppButtons()}

        </Paper>
      </div>
    )
  }
}

Info.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(controlStyles)(Info);
