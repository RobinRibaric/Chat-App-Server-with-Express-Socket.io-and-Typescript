interface user {
    id: number;
    name: string;
}

const users: user[] = [];

const addUser = ({ id, name }: { id: number, name: string}): Object => {
    name = name.trim().toLowerCase();

    const existingUser = users.find((user) => user.name === name);

    if (existingUser) return { error: 'Username is taken' };

    const user = { id, name };

    users.push(user);
    return { user };
};


const removeUser = (id: number) => {
    const index = users.findIndex((user) => user.id === id);

    if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = (id: number) => users.find((user) => user.id === id);

const getAllUsers = () => users;


module.exports = {
    addUser,
    removeUser,
    getUser,
    getAllUsers
};