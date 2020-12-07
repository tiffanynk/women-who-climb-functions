const isEmpty = (string) => {
    return (string.trim() === '') ? true : false
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)){
        return true
    } else {
        return false
    }
}

exports.validateSignup = (data) => {
    let errors = {};

    if(isEmpty(data.email)){
        errors.email = 'Required field'
    } else if(!isEmail(data.email)){
        errors.email = 'Must provide valid email address'
    }

    if(isEmpty(data.password)){
        errors.password = 'Required field'
    }
    
    if(data.password !== data.confirmPassword){
        errors.confirmPassword = 'Passwords do not match'
    }

    if(isEmpty(data.handle)){
        errors.handle = 'Required field'
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validateLogin = (data) => {
    let errors = {}

    if(isEmpty(data.email)){
        errors.email = 'Required field';
    }
    if(isEmpty(data.password)){
        errors.password = 'Required field';
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.reduceUserDetails = (data) => {
    let userDetails = {};

    if(!isEmpty(data.pronouns.trim())) {
        userDetails.pronouns = data.pronouns;
    }

    if(!isEmpty(data.bio.trim())) {
        userDetails.bio = data.bio;
    }

    if (!isEmpty(data.website.trim())) {
        if (data.website.trim().substring(0, 4) !== 'http') {
            userDetails.website = `http://${data.website.trim()}`;
        } else userDetails.website = data.website;
    }

    if(!isEmpty(data.climbingStyle.trim())){
        userDetails.climbingStyle = data.climbingStyle;
    }

    if(!isEmpty(data.location.trim())){
        userDetails.location = data.location;
    }

    return userDetails;
}