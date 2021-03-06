import React, { Component } from 'react';
import { Button, Input, DatePicker, Radio } from 'antd';
import { graphql, compose } from 'react-apollo';
import { Redirect } from 'react-router-dom';
import moment from 'moment';
import { SelectInput } from '@components';
import {
  DraggableCards,
  TableStations,
  SeatPricing,
} from './components';
import { AllLocations, AllSalons, CreatTrip } from '../../services';
import './trip-composer.css';
import { handleResponse } from '@utilities';

const RadioGroup = Radio.Group;
const { RangePicker } = DatePicker;

class TripComposerView extends Component {
  state = {
    selectedCities: [],
    startScheduling: false,
    locations_name: [],
    selectedLocationObj: [],
    selectedCitiesObject: [],
    seatPrice: false,
    /**Trip Composer Mutation Data */
    addons: [],
    timeLines: {},
    access_level: 'Public',
    bookingLocations: [],
    POS: [],
    success: false,
  };

  ref_code = '';
  from_date = '';
  to_date = '';
  routeLines = {};
  arrangedSelectedLocations = [];
  busesSalons = [];
  allStations = this.props.allLocations.filter(
    location => location.type === 'Station'
  );
  allStationsName = this.allStations.map(stationObj => stationObj.name_en);

  handleMultipleSelectChange = selectedCities => {
    this.onCityDelete(selectedCities);
    this.setState({
      selectedCities,
    });
  };

  /**Delete selected locations of Deleted city
   *
   * @param {Array} newArray - selected cities after deletion
   * @returns {undefined}
   */
  onCityDelete = newArray => {
    const { selectedCities, startScheduling } = this.state;
    if (selectedCities.length > newArray.length) {
      /**Get the Deleted city
       * @function
       * @returns {String} deletedCity
       */
      let deletedCity = selectedCities
        .filter(city => !newArray.includes(city))
        .toString();
      this.arrangedSelectedLocations = this.arrangedSelectedLocations.filter(
        locationObj => locationObj.city !== deletedCity
      );
      /**Delete scheduling and seat pricing step on deleting the cities */
      this.setState({
        startScheduling: false,
        seatPrice: false,
      });
    }
  };

  getCities = cities => {
    this.setState({ selectedCities: cities });
  };

  updateLocationsArray(city, arrayofObjects, locations) {
    // arrayofObjects = [{city: 'Cairo', locations: ['Maadi', 'Naser City']}]
    let isCityExist = arrayofObjects.find(cityObj => cityObj.city === city);
    isCityExist
      ? (isCityExist.locations = locations)
      : (arrayofObjects = [...arrayofObjects, { city, locations }]);
    return arrayofObjects;
  }

  getLocations = (locations, city) => {
    this.arrangedSelectedLocations = this.updateLocationsArray(
      city,
      this.arrangedSelectedLocations,
      locations
    );
  };

  getSeatPricing = routeLines => {
    this.routeLines = routeLines;
  };

  getBuses = busesSalons => {
    this.busesSalons = busesSalons;
  };

  getAddons = addons => {
    this.setState({ addons });
  };

  getTimeLines = timeLines => {
    this.setState({ timeLines });
  };

  handelOnClickSeatPrice = () => {
    const { selectedCities, selectedCitiesObject } = this.state;
    /**Arrange selected cities object according to arranged cities */
    selectedCitiesObject.sort(function(a, b) {
      return selectedCities.indexOf(a.name) - selectedCities.indexOf(b.name);
    });
    this.setState({ seatPrice: true, selectedCitiesObject });
  };

  handelOnClickSchedule = () => {
    const { selectedCities } = this.state;
    const { allCityObj } = this.props;
    let locations_name = [];
    /**Arrange selected locations according to arranged cities */
    this.arrangedSelectedLocations.sort(function(a, b) {
      return selectedCities.indexOf(a.city) - selectedCities.indexOf(b.city);
    });
    locations_name = this.arrangedSelectedLocations
      .map(locationObj => locationObj.locations)
      .flat();
    /**get selected locations object */
    let selectedLocationObj = this.arrangedSelectedLocations
      .map(locObj => {
        return this.props.allLocations.filter(
          locationObj =>
            locationObj.city.name_en === locObj.city &&
            locObj.locations.includes(locationObj.name_en)
        );
      })
      .flat();
    let selectedCitiesFromLocations = [
      ...new Set(
        selectedLocationObj.map(locObj => {
          return locObj.city.id;
        })
      ),
    ];
    let selectedCitiesObject = allCityObj;
    selectedCitiesObject = selectedCitiesObject.filter(cityObj =>
      selectedCitiesFromLocations.includes(cityObj.id)
    );
    this.setState({
      startScheduling: true,
      locations_name,
      selectedLocationObj,
      selectedCitiesObject,
    });
  };

  onChangeref_code = e => {
    this.ref_code = e.target.value;
  };

  onChangeRange = (date, dateString) => {
    this.from_date = dateString[0];
    this.to_date = dateString[1];
  };

  onChangeAcessLevel = e => {
    this.setState({ access_level: e.target.value });
  };

  handleSelectPOS = values => {
    let stationIds = values.map(value => {
      return this.allStations.find(station => station.name_en === value).id;
    });
    let bookingLocations = stationIds.map(station => {
      return {
        location_id: station,
      };
    });
    this.setState({ bookingLocations, POS: values });
  };

  onSubmit = () => {
    const {
      locations_name,
      selectedLocationObj,
      timeLines,
      access_level,
      bookingLocations,
      addons,
    } = this.state;
    const { ref_code, from_date, to_date, routeLines } = this;
    let tripComposerData = {
      ref_code,
      access_level,
      from_date,
      to_date,
      is_active: 'Active',
      locations: {
        create: selectedLocationObj.map(locationObj => {
          return { location_id: locationObj.id };
        }),
      },
      routeLines: routeLines === false ? { create: [] } : routeLines,
      timeLines,
      bookingLocations: {
        create: bookingLocations,
      },
      addons: { create: addons },
    };
    this.props
      .CreatTrip({ variables: { input: tripComposerData } })
      .then(response => {
        let ref_code = response.data.createTripTemplate.ref_code;
        const desc = `ref_code: ${ref_code}`;
        handleResponse('success', desc, `Trip Created Sucessfully with`);
        this.setState({ success: true });
      })
      .catch(error => {
        // const customError = `Please fill all the fields`;
        if (error) {
          let customError =
            error.toString().includes('not to be null') ||
            error.toString().includes('was not provided')
              ? `Please fill all the fields`
              : undefined;
          handleResponse('error', error, customError);
        }
      });
    const { createTrip, called, client } = this.props.CreatTrip;
  };

  disabledDate(current) {
    // Can not select days before today and today
    return current && current < moment().endOf('day');
  }

  render() {
    const {
      selectedCities,
      startScheduling,
      locations_name,
      selectedLocationObj,
      seatPrice,
      selectedCitiesObject,
      access_level,
      POS,
    } = this.state;

    const { allcities, allLocations, allSalons } = this.props;
    return (
      <div className="trip-composer">
        <h1>New Trip</h1>
        <label>Ref Code (SKU)</label>
        <Input
          placeholder="Please enter ref_code"
          style={{ width: '300px', display: 'block', margin: '0 0 20px' }}
          onChange={this.onChangeref_code}
        />
        <div style={{ margin: '20px 0' }}>
          <label style={{ display: 'block' }}>Access</label>
          <RadioGroup onChange={this.onChangeAcessLevel} value={access_level}>
            <Radio value={'Public'}>Public</Radio>
            <Radio value={'Private'}>Private</Radio>
          </RadioGroup>
          {access_level === 'Private' ? (
            <SelectInput
              options={this.allStationsName}
              handleChange={this.handleSelectPOS}
              mode="multiple"
              placeholder="Specify POS"
              value={POS}
              style={{ width: '150px' }}
              selectedCities={POS}
            />
          ) : null}
        </div>
        <label>Trip Range</label>
        <RangePicker
          onChange={this.onChangeRange}
          style={{ width: '300px', display: 'block', margin: '20px 0' }}
          disabledDate={this.disabledDate}
        />
        <h2>Start creating route and instances</h2>
        <div style={{ width: '300px' }}>
          <SelectInput
            options={allcities}
            handleChange={this.handleMultipleSelectChange}
            mode="multiple"
            placeholder="Select Line Cities"
            value={selectedCities}
            style={{ width: '100%' }}
            selectedCities={selectedCities}
          />
        </div>

        {selectedCities.length !== 0 ? (
          <DraggableCards
            selectedCities={selectedCities}
            getCities={this.getCities}
            getLocations={this.getLocations}
            selectedLocations={this.arrangedSelectedLocations}
            activeLocations={allLocations}
          />
        ) : null}

        {selectedCities.length > 1 ? (
          <div style={{ textAlign: 'right', padding: '20px 0' }}>
            <Button type="primary" onClick={this.handelOnClickSchedule}>
              Start Scheduling
            </Button>
          </div>
        ) : null}

        {startScheduling ? (
          <div style={{ paddingTop: '20px' }}>
            {selectedCitiesObject.length > 1 ? (
              <TableStations
                locations_name={locations_name}
                getBuses={this.getBuses}
                allBusesQuery={allSalons}
                getTimeLines={this.getTimeLines}
                selectedLocationObj={selectedLocationObj}
              />
            ) : (
              <p style={{ color: 'red' }}>
                Please Select more than one Location from at least 2 different
                cities
              </p>
            )}
            <div style={{ textAlign: 'right', padding: '20px 0' }}>
              <Button type="primary" onClick={this.handelOnClickSeatPrice}>
                Set Seats Price
              </Button>
            </div>
          </div>
        ) : null}

        {seatPrice ? (
          this.busesSalons.length !== 0 ? (
            <SeatPricing
              selectedCities={selectedCitiesObject}
              busTypes={this.busesSalons}
              getSeatPricing={this.getSeatPricing}
            />
          ) : (
            <p style={{ color: 'red' }}>Please Select at least One Bus Salon</p>
          )
        ) : null}
        <Button style={{ margin: '20px 0' }} type="primary" onClick={this.onSubmit}>
          Create Trip
        </Button>
      </div>
    );
  }
}

/**Get All Cities and Locations when trip composer load, compose() function to use multiple graphql() HOCs together
 *
 * @function
 * @param {Component} TripComposer - Compoenent who will need these query/mutaions
 * @returns {Component} TripComposer - connected to these queries
 */
export default compose(
  graphql(AllLocations, { name: 'AllLocations' }),
  graphql(AllSalons, { name: 'AllSalons' }),
  graphql(CreatTrip, { name: 'CreatTrip' })
)(TripComposer);

/**َGet AllCities and AllLocations as a props and render according to the returned data
 *
 * @function
 * @param {Object} props - return of compose() request
 * @returns {Component} TripComposerView
 */
function TripComposer(props) {
  const { activeLocations, error, loading } = props.AllLocations;
  const salonsObject = {
    error: props.AllSalons.error,
    loading: props.AllSalons.loading,
    allBusSalons: props.AllSalons.allBusSalons,
  };
  /** Get active cities has active locations only*/
  let allCitiesObj = activeLocations
    ? activeLocations
        .filter(location => location.is_active === 'Active')
        .map(location => location.city)
        .filter(city => city.is_active === 'Active')
        .map(city => {
          return { id: city.id, name: city.name_en };
        })
    : [];
  let uniqueCitiesObj = Array.from(
    new Set(allCitiesObj.map(cityObj => cityObj.id))
  ).map(id => {
    return { id: id, name: allCitiesObj.find(city => city.id === id).name };
  });
  let allCities = allCitiesObj.map(cityObj => cityObj.name);
  let uniqueCities = [...new Set(allCities)];
  return loading ? (
    <div>Loading...</div>
  ) : error ? (
    <div>
      {error.graphQLErrors.map(({ message }, i) => (
        <span key={i}>{message}</span>
      ))}
    </div>
  ) : (
    <div>
      <TripComposerView
        allcities={uniqueCities}
        allLocations={activeLocations}
        allSalons={salonsObject}
        allCityObj={uniqueCitiesObj}
        CreatTrip={props.CreatTrip}
      />
    </div>
  );
}
