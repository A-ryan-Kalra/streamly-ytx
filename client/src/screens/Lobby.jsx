import React from "react";

function Lobby() {
  return (
    <div className="flex gap-y-4 flex-col  w-full h-screen  items-center">
      <h1 className="text-4xl font-semibold my-4 text-teal-500 ">
        Welcome to the Lobby
      </h1>
      <form className="flex flex-col gap-y-2 ">
        <div className=" flex gap-x-4 items-center justify-between">
          <label htmlFor="name" className="sm:text-lg">
            Enter Name
          </label>
          <input
            type="text"
            id="name"
            autoComplete="username"
            className="bg-zinc-200 p-1 border-none outline-none focus-visible:ring-0"
          />
        </div>
        <div className=" flex gap-x-4 items-center justify-between">
          <label htmlFor="room" className="sm:text-lg">
            Enter Room No
          </label>
          <input
            id="room"
            className="bg-zinc-200 p-1 border-none outline-none focus-visible:ring-0"
          />
        </div>
        <button className="bg-cyan-400 mt-2 w-fit ml-auto hover:scale-110 transition duration-300 px-10 cursor-pointer py-2 rounded-2xl ">
          Submit
        </button>
      </form>
    </div>
  );
}

export default Lobby;
