import React, {Component} from 'react';
import './App.css';
import PropTypes from 'prop-types';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
        this.loadData();
    }

    getInitialState = () => ({
        providers: undefined,
        services: undefined,
        load_failed: false,
        selectedProviders: [],
        selectedTags: [],
        search: ''
    });

    loadData() {
        fetch('/data.json').then(response => {
            if (response.ok) {
                return response.json();
            } else {
                this.setState({load_failed: true});
            }
        }).then(data => {
            this.setState({
                providers: data.providers,
                services: data.services.sort((a, b) => a.name - b.name),
                tags: data.tags
            });
        });
    }


    render() {
        const {providers, load_failed, search} = this.state;
        let selectedProviders = this.state.selectedProviders;

        if (selectedProviders.length === 0) {
            selectedProviders = providers ? Object.keys(providers) : [];
        }

        let selectedTags = this.state.selectedTags;
        if (selectedTags.length === 0) {
            selectedTags = undefined;
        }

        let services = this.state.services;

        services = services ? services.filter(s =>
            (s.name.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
            && selectedProviders.includes(s.provider) && (selectedTags ? selectedTags.every(st => s.tags.some(t => t.toLowerCase().includes(st.toLowerCase()))) : true)
        ) : undefined;

        let tags = this.state.tags;
        tags = App.flatten(tags);

        return (
            <div className="App">
                <header className="App-header">
                    <h1>Serverless Index</h1>
                </header>
                <main>
                    {load_failed ? <p className={'error'}>Failed to load data</p> : ''}
                    <div>
                        <h2>Search</h2>
                        <div id={'search'}>
                            <TextField name={'By name'} onChange={(value) => this.setState({
                                search: value
                            })}/>
                            {providers ? <CheckList name={'By provider'} onChange={(selectedValues) => this.setState({
                                selectedProviders: selectedValues
                            })} objects={Object.keys(providers).map(k => ({key: k, value: providers[k].name}))}/> : ''}
                            <MultiSearch name={'By tag'} onChange={tags => this.setState({selectedTags: tags})} searchOptions={tags}/>
                        </div>
                    </div>
                    <ServiceTable loading={!services} services={services} providers={providers}/>
                </main>
            </div>
        );
    }

    static flatten(tags) {
        let result = [];
        for (const i in tags) {
            result = [...result, ...tags[i]];
        }
        return result;
    }
}

class TextField extends Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState = () => ({
        value: ''
    });

    onChange(event) {
        const data = event.target.value;
        this.setState({value: data});
        if (this.props.onChange) {
            this.props.onChange(data);
        }
    }

    render() {
        const {name} = this.props;
        return (
            <div className={'input-container'}>
                <label className={'main'} htmlFor={name}>{name}</label>
                <input id={name} type={'text'} onChange={this.onChange.bind(this)}/>
            </div>
        );
    }
}

TextField.propTypes = {
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

class CheckList extends Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState = () => {
        const {objects} = this.props;
        const stateMap = {};
        for (const object of objects) {
            stateMap[object.key] = false;
        }
        return {values: stateMap};
    };

    onChange(event) {
        const {target: {checked, value}} = event;
        const {values} = this.state;
        values[value] = checked;
        this.setState({values: values});
        const selectedValues = [];
        for (const prop in values) {
            if (values[prop]) {
                selectedValues.push(prop);
            }
        }
        this.props.onChange(selectedValues);
    }

    render() {
        const {name, objects} = this.props;
        return (
            <div>
                <label className={'main'}>{name}</label>
                {objects.map(o => (
                    <div key={o.key}>
                        <input id={o.key} type={'checkbox'} value={o.key} checked={this.state.values[o.key]} onChange={this.onChange.bind(this)}/>
                        <label htmlFor={o.key}>{o.value}</label>
                    </div>
                ))}
            </div>
        );
    }
}

CheckList.propTypes = {
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    objects: PropTypes.arrayOf(PropTypes.object).isRequired
};

class MultiSearch extends Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState = () => ({
        search: '',
        searches: []
    });

    onChange(event) {
        const {target: {value}} = event;
        this.setState({search: value});
    }

    onKeyDown(event) {
        const {key} = event;
        if (key === 'Enter') {
            const {searches, search} = this.state;
            if (!searches.includes(search) && search !== '') {
                searches.push(search);
                this.setState({search: '', searches: searches});
                this.props.onChange(searches);
            } else {
                this.setState({search: ''});
            }
        }
    }

    removeSearch(search) {
        let {searches} = this.state;
        searches = searches.filter(s => s !== search);
        this.setState({searches: searches});
        this.props.onChange(searches);
    }

    render() {
        const {searchOptions, name} = this.props;
        return (
            <div className={'input-container multi-search'}>
                <label className={'main'} htmlFor={name}>{name}</label>
                {searchOptions ?
                    <datalist id={'search-data-' + name}>
                        {searchOptions.map(so => <option key={so} value={so}/>)}
                    </datalist>
                    : ''}
                <input type={'search'} id={name} value={this.state.search} onChange={this.onChange.bind(this)} onKeyDown={this.onKeyDown.bind(this)} list={'search-data-' + name}/>
                <div className={'searches'}>
                    {this.state.searches.map(s => <span key={s} className={'search-item'}>{s}
                        <button onClick={this.removeSearch.bind(this, s)}>&times;</button></span>)}
                </div>
            </div>
        );
    }
}

MultiSearch.propTypes = {
    onChange: PropTypes.func.isRequired,
    searchOptions: PropTypes.arrayOf(PropTypes.string),
    name: PropTypes.string.isRequired
};

class ServiceTable extends Component {
    render() {
        const {services, loading} = this.props;
        return loading ?
            (<p>Loading</p>) :
            (<div id={'services'}>{services ? services.map(this.renderItem.bind(this)) : (
                <p className={'error'}>Invalid state (not loading but no services)</p>)}</div>);
    }

    renderItem(item) {
        const provider = this.props.providers[item.provider];
        return (
            <div key={item.name}>
                <a href={item.url} target={'_blank'}>{item.name}</a>
                <a href={provider.url} target={'_blank'}>{provider.name}</a>
                <div className={'tags'}>
                    {item.tags.map(tag => (<span key={tag}>{tag}</span>))}
                </div>
            </div>
        );
    }
}

ServiceTable.propTypes = {
    services: PropTypes.arrayOf(PropTypes.object),
    loading: PropTypes.bool
};

class CollapsibleElement extends Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState = () => ({
        collapsed: false
    });

    toggleCollapse() {
        this.setState({collapsed: !this.state.collapsed});
    }

    render() {
        return (
            <div>
                <button className={'collapsed-button'} onClick={this.toggleCollapse.bind(this)}>
                    {this.state.collapsed ? <span>&#9656;</span> : <span>&#9662;</span>}
                    {this.props.titleElement}</button>
                {!this.state.collapsed ? this.props.children : ''}
            </div>
        );
    }
}

CollapsibleElement.propTypes = {
    titleElement: PropTypes.element.isRequired,
    children: PropTypes.element.isRequired
};

export default App;
